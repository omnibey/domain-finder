import { DomainCheckResult } from '../types';
import { DomainProvider } from './types';

/**
 * GoDaddy Domains API Provider.
 * Official endpoint: POST /v1/domains/available
 * Authorization: sso-key {API_KEY}:{API_SECRET}
 */
export class GoDaddyProvider implements DomainProvider {
  id = 'godaddy';
  name = 'GoDaddy Availability API';
  isMock = false;
  maxBatchSize = 20;

  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  isTldSupported(): boolean {
    return true; // GoDaddy supports almost all ICANN TLDs
  }

  async checkBatch(domains: string[]): Promise<DomainCheckResult[]> {
    const now = new Date().toISOString();

    if (!this.apiKey || !this.apiSecret) {
      return domains.map((domain) => ({
        domain,
        status: 'UNKNOWN',
        price: null,
        currency: null,
        premium: null,
        checkedAt: now,
        provider: this.name,
        reason: 'GoDaddy API credentials (GODADDY_API_KEY or GODADDY_API_SECRET) missing',
      }));
    }

    const batch = domains.slice(0, 20);
    const url = 'https://api.godaddy.com/v1/domains/available?checkType=FAST';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `sso-key ${this.apiKey}:${this.apiSecret}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        return batch.map((domain) => ({
          domain,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: `GoDaddy API error HTTP ${response.status}: ${errorText.slice(0, 80)}`,
        }));
      }

      interface GoDaddyCheckItem {
        domain?: string;
        available?: boolean;
        price?: number;
        currency?: string;
        period?: number;
      }

      interface GoDaddyBatchResponse {
        domains?: GoDaddyCheckItem[];
        code?: string;
        message?: string;
      }

      const data: GoDaddyBatchResponse = await response.json();

      if (!Array.isArray(data.domains)) {
        return batch.map((domain) => ({
          domain,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: data.message || 'Invalid GoDaddy response format',
        }));
      }

      const resultMap = new Map<string, GoDaddyCheckItem>();
      for (const item of data.domains) {
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
            reason: 'Domain omitted from response',
          };
        }

        const isAvailable = Boolean(item.available);
        // GoDaddy returns price in micro-units (e.g. 10990000 = $10.99) or normal float depending on endpoint
        let priceStr: string | null = null;
        if (typeof item.price === 'number') {
          const val = item.price > 1000 ? item.price / 1000000 : item.price;
          priceStr = `$${val.toFixed(2)}${item.currency ? ` ${item.currency}` : ''}/yr`;
        }

        if (isAvailable) {
          return {
            domain: lower,
            status: 'AVAILABLE',
            price: priceStr,
            currency: item.currency || 'USD',
            premium: null,
            checkedAt: now,
            provider: this.name,
          };
        }

        return {
          domain: lower,
          status: 'REGISTERED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'Domain is registered',
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
        reason: isTimeout ? 'GoDaddy request timed out' : 'GoDaddy connection failure',
      }));
    }
  }
}
