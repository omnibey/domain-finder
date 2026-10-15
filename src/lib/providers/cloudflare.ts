import { DomainCheckResult } from '../types';
import { DomainProvider } from './types';

/**
 * Cloudflare Registrar API Provider.
 * Official endpoint: POST /client/v4/accounts/{account_id}/registrar/domains/check
 * Strictly adheres to Cloudflare's 20-domain batch limit and documentation.
 */
export class CloudflareProvider implements DomainProvider {
  id = 'cloudflare';
  name = 'Cloudflare Registrar API';
  isMock = false;
  maxBatchSize = 20;

  private apiToken: string;
  private accountId: string;

  constructor(apiToken: string, accountId: string) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  isTldSupported(tld: string): boolean {
    // Cloudflare Registrar supports over 300 TLDs (com, net, org, io, co, etc.)
    const unsupported = ['.ai']; // Cloudflare Registrar famously does not support .ai registration
    return !unsupported.includes(tld.toLowerCase());
  }

  async checkBatch(domains: string[]): Promise<DomainCheckResult[]> {
    const now = new Date().toISOString();

    if (!this.apiToken || !this.accountId) {
      return domains.map((domain) => ({
        domain,
        status: 'UNKNOWN',
        price: null,
        currency: null,
        premium: null,
        checkedAt: now,
        provider: this.name,
        reason: 'Cloudflare API credentials (CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID) missing',
      }));
    }

    // Cloudflare enforces a maximum of 20 domains per request
    const batch = domains.slice(0, 20);
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/registrar/domains/check`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domains: batch }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        const reason = response.status === 429
          ? 'Cloudflare rate limit exceeded'
          : `Cloudflare API error HTTP ${response.status}: ${errorText.slice(0, 100)}`;

        return batch.map((domain) => ({
          domain,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason,
        }));
      }

      interface CloudflareCheckItem {
        domain?: string;
        available?: boolean;
        supported_tld?: boolean;
        price?: number;
        currency?: string;
        premium?: boolean;
        can_register?: boolean;
      }

      interface CloudflareApiResponse {
        success: boolean;
        result?: CloudflareCheckItem[];
        errors?: Array<{ message: string }>;
      }

      const data: CloudflareApiResponse = await response.json();

      if (!data.success || !Array.isArray(data.result)) {
        const errMsg = data.errors?.map((e) => e.message).join(', ') || 'API response format invalid';
        return batch.map((domain) => ({
          domain,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: errMsg,
        }));
      }

      // Map Cloudflare results back to domains
      const resultMap = new Map<string, CloudflareCheckItem>();
      for (const item of data.result) {
        if (item.domain) {
          resultMap.set(item.domain.toLowerCase(), item);
        }
      }

      return batch.map((domain) => {
        const lower = domain.toLowerCase();
        const item = resultMap.get(lower);

        if (!item) {
          return {
            domain: lower,
            status: 'UNKNOWN',
            price: null,
            currency: null,
            premium: null,
            checkedAt: now,
            provider: this.name,
            reason: 'Domain result omitted by registrar',
          };
        }

        if (item.supported_tld === false) {
          return {
            domain: lower,
            status: 'UNSUPPORTED',
            price: null,
            currency: null,
            premium: null,
            checkedAt: now,
            provider: this.name,
            reason: 'Extension is not supported by Cloudflare Registrar',
          };
        }

        const isAvailable = Boolean(item.available || item.can_register);
        const isPremium = typeof item.premium === 'boolean' ? item.premium : null;
        const priceStr = typeof item.price === 'number'
          ? `$${item.price.toFixed(2)}${item.currency ? ` ${item.currency}` : ''}/yr`
          : null;

        if (isAvailable) {
          if (isPremium) {
            return {
              domain: lower,
              status: 'PREMIUM',
              price: priceStr,
              currency: item.currency || 'USD',
              premium: true,
              checkedAt: now,
              provider: this.name,
            };
          }
          return {
            domain: lower,
            status: 'AVAILABLE',
            price: priceStr,
            currency: item.currency || 'USD',
            premium: false,
            checkedAt: now,
            provider: this.name,
          };
        }

        return {
          domain: lower,
          status: 'REGISTERED',
          price: null,
          currency: null,
          premium: isPremium,
          checkedAt: now,
          provider: this.name,
          reason: 'Domain is already registered',
        };
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return batch.map((domain) => ({
        domain,
        status: 'UNKNOWN',
        price: null,
        currency: null,
        premium: null,
        checkedAt: now,
        provider: this.name,
        reason: isTimeout ? 'Cloudflare request timed out' : 'Cloudflare connection error',
      }));
    }
  }
}
