import { DomainCheckResult } from '../types';
import { DomainProvider } from './types';

/**
 * Mock Provider for development, testing, and offline demonstration.
 * Produces deterministic, realistic domain availability results.
 * Clearly marks all results as mock/simulated.
 */
export class MockProvider implements DomainProvider {
  id = 'mock';
  name = 'Mock Provider (Development / Demo Mode)';
  isMock = true;
  maxBatchSize = 20;

  // Realistic mock pricing by TLD
  private tldPrices: Record<string, string> = {
    '.com': '$10.99/yr',
    '.net': '$12.99/yr',
    '.org': '$11.99/yr',
    '.io': '$39.99/yr',
    '.ai': '$79.99/yr',
    '.co': '$25.99/yr',
    '.dev': '$14.99/yr',
    '.app': '$16.99/yr',
  };

  // Known registered mock dictionary
  private registeredPrefixes = new Set([
    'a', 'b', 'c', 'd', 'e', 'g', 'i', 'm', 'x', 'y', 'z',
    'app', 'web', 'dev', 'api', 'cloud', 'mail', 'test', 'tech',
    'super', 'smart', 'hyper', 'omni', 'fast', 'quick', 'easy'
  ]);

  isTldSupported(tld: string): boolean {
    const supported = ['.com', '.net', '.org', '.io', '.ai', '.co', '.dev', '.app', '.xyz', '.me'];
    return supported.includes(tld.toLowerCase());
  }

  async checkBatch(domains: string[]): Promise<DomainCheckResult[]> {
    // Artificial small delay to simulate network latency (50ms)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const now = new Date().toISOString();

    return domains.map((domain) => {
      const lower = domain.toLowerCase().trim();
      const dotIndex = lower.indexOf('.');
      const label = dotIndex !== -1 ? lower.slice(0, dotIndex) : lower;
      const tld = dotIndex !== -1 ? lower.slice(dotIndex) : '.com';

      // Unsupported TLD check
      if (!this.isTldSupported(tld)) {
        return {
          domain: lower,
          status: 'UNSUPPORTED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: `TLD "${tld}" is not supported by this registrar`,
        };
      }

      // Explicit test triggers for testing all statuses
      if (lower.startsWith('test-unknown')) {
        return {
          domain: lower,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'Simulated network timeout/lookup failure',
        };
      }

      if (lower.startsWith('test-premium')) {
        return {
          domain: lower,
          status: 'PREMIUM',
          price: '$2,499.00',
          currency: 'USD',
          premium: true,
          checkedAt: now,
          provider: this.name,
          reason: 'Premium registry pricing applies',
        };
      }

      if (lower.startsWith('test-unsupported')) {
        return {
          domain: lower,
          status: 'UNSUPPORTED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'Registry does not allow registration of this extension',
        };
      }

      // Deterministic simulation based on label hash
      let hash = 0;
      for (let i = 0; i < lower.length; i++) {
        hash = (hash * 31 + lower.charCodeAt(i)) & 0xffffffff;
      }
      const positiveHash = Math.abs(hash);

      // Single or double letter domains on .com are almost always registered or premium
      if (label.length <= 2 && tld === '.com') {
        const isPremium = positiveHash % 5 === 0;
        return {
          domain: lower,
          status: isPremium ? 'PREMIUM' : 'REGISTERED',
          price: isPremium ? '$1,850.00' : null,
          currency: isPremium ? 'USD' : null,
          premium: isPremium ? true : null,
          checkedAt: now,
          provider: this.name,
          reason: isPremium ? 'High-value short domain' : 'Already registered',
        };
      }

      // If matches registered prefixes, simulate registered
      if (this.registeredPrefixes.has(label)) {
        return {
          domain: lower,
          status: 'REGISTERED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'Domain name already registered by third party',
        };
      }

      // About ~35% of generated patterns are available in this mock
      const modulo = positiveHash % 100;
      if (modulo < 35) {
        return {
          domain: lower,
          status: 'AVAILABLE',
          price: this.tldPrices[tld] || '$12.99/yr',
          currency: 'USD',
          premium: false,
          checkedAt: now,
          provider: this.name,
        };
      } else if (modulo < 40) {
        return {
          domain: lower,
          status: 'PREMIUM',
          price: '$499.00',
          currency: 'USD',
          premium: true,
          checkedAt: now,
          provider: this.name,
          reason: 'Categorized as premium domain',
        };
      } else {
        return {
          domain: lower,
          status: 'REGISTERED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: now,
          provider: this.name,
          reason: 'Domain currently active in registry',
        };
      }
    });
  }
}
