import { DomainCheckResult } from '../types';
import { DomainProvider } from './types';

/**
 * Official ICANN Registration Data Access Protocol (RDAP) Provider.
 * Queries legitimate ICANN registry RDAP endpoints without requiring paid API tokens.
 * HTTP 404 = Domain Not Registered (AVAILABLE)
 * HTTP 200 = Domain Registered (REGISTERED)
 */
export class RdapProvider implements DomainProvider {
  id = 'rdap';
  name = 'ICANN RDAP (Official Registry Protocol)';
  isMock = false;
  maxBatchSize = 20;

  isTldSupported(tld: string): boolean {
    const supported = [
      '.com', '.net', '.org', '.io', '.co', '.dev', '.app',
      '.info', '.biz', '.me', '.us', '.ca', '.uk', '.in'
    ];
    return supported.includes(tld.toLowerCase());
  }

  private getRdapUrl(domain: string): string {
    const lower = domain.toLowerCase();
    if (lower.endsWith('.com')) {
      return `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(lower)}`;
    }
    if (lower.endsWith('.net')) {
      return `https://rdap.verisign.com/net/v1/domain/${encodeURIComponent(lower)}`;
    }
    // Generic bootstrap redirector
    return `https://rdap.org/domain/${encodeURIComponent(lower)}`;
  }

  async checkSingleDomain(domain: string, timeoutMs = 6000): Promise<DomainCheckResult> {
    const now = new Date().toISOString();
    const lower = domain.toLowerCase().trim();
    const dotIndex = lower.indexOf('.');
    const tld = dotIndex !== -1 ? lower.slice(dotIndex) : '';

    if (!this.isTldSupported(tld)) {
      return {
        domain: lower,
        status: 'UNSUPPORTED',
        price: null,
        currency: null,
        premium: null,
        checkedAt: now,
        provider: this.name,
        reason: `RDAP lookup is not configured for TLD "${tld}"`,
      };
    }

    const url = this.getRdapUrl(lower);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/rdap+json, application/json',
          'User-Agent': 'DomainFinder/1.0 (+https://github.com/domainfinder)',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 404) {
        // 404 Not Found in RDAP definitively indicates domain is not registered
        return {
          domain: lower,
          status: 'AVAILABLE',
          price: null, // RDAP does not expose registrar sales pricing
          currency: null,
          premium: null, // Unknown without registrar pricing API
          checkedAt: now,
          provider: this.name,
        };
      }

      if (response.status === 200) {
        return {
          domain: lower,
          status: 'REGISTERED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'Domain record found in registry',
        };
      }

      if (response.status === 429) {
        return {
          domain: lower,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'RDAP registry rate limit reached (HTTP 429)',
        };
      }

      return {
        domain: lower,
        status: 'UNKNOWN',
        price: null,
        currency: null,
        premium: null,
        checkedAt: now,
        provider: this.name,
        reason: `Unexpected registry response (HTTP ${response.status})`,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        domain: lower,
        status: 'UNKNOWN',
        price: null,
        currency: null,
        premium: null,
        checkedAt: now,
        provider: this.name,
        reason: isTimeout ? 'Registry query timed out' : 'Registry connection failed',
      };
    }
  }

  async checkBatch(domains: string[]): Promise<DomainCheckResult[]> {
    // Check with small controlled concurrency (max 4 parallel requests) to respect RDAP rate limits
    const results: DomainCheckResult[] = [];
    const concurrency = 4;

    for (let i = 0; i < domains.length; i += concurrency) {
      const chunk = domains.slice(i, i + concurrency);
      const chunkPromises = chunk.map((d) => this.checkSingleDomain(d));
      const settled = await Promise.allSettled(chunkPromises);

      for (let j = 0; j < chunk.length; j++) {
        const item = settled[j];
        if (item.status === 'fulfilled') {
          results.push(item.value);
        } else {
          results.push({
            domain: chunk[j],
            status: 'UNKNOWN',
            price: null,
            currency: null,
            premium: null,
            checkedAt: new Date().toISOString(),
            provider: this.name,
            reason: 'Unhandled check error',
          });
        }
      }

      // Small throttle between mini-chunks
      if (i + concurrency < domains.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return results;
  }
}
