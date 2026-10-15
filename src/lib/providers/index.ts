import { DomainProvider, ProviderStatus } from './types';
import { MockProvider } from './mock';
import { RdapProvider } from './rdap';
import { CloudflareProvider } from './cloudflare';
import { GoDaddyProvider } from './godaddy';

/**
 * Returns the configured domain availability provider.
 * Follows strict priority order:
 * 1. Explicit DOMAIN_PROVIDER env var ('cloudflare' | 'godaddy' | 'rdap' | 'mock')
 * 2. If Cloudflare credentials exist -> CloudflareProvider
 * 3. If GoDaddy credentials exist -> GoDaddyProvider
 * 4. Default -> RdapProvider (official ICANN registry protocol, zero credentials required)
 * 5. Test/Offline -> MockProvider
 */
export function getActiveProvider(): DomainProvider {
  const chosen = (process.env.DOMAIN_PROVIDER || '').toLowerCase();

  if (chosen === 'mock' || process.env.USE_MOCK === 'true') {
    return new MockProvider();
  }

  const cfToken = process.env.CLOUDFLARE_API_TOKEN || '';
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  if (chosen === 'cloudflare' || (cfToken && cfAccount && chosen !== 'rdap')) {
    return new CloudflareProvider(cfToken, cfAccount);
  }

  const gdKey = process.env.GODADDY_API_KEY || '';
  const gdSecret = process.env.GODADDY_API_SECRET || '';
  if (chosen === 'godaddy' || (gdKey && gdSecret && chosen !== 'rdap')) {
    return new GoDaddyProvider(gdKey, gdSecret);
  }

  if (chosen === 'rdap' || !chosen) {
    return new RdapProvider();
  }

  // Fallback to mock
  return new MockProvider();
}

/**
 * Returns current provider status for UI health indicators.
 */
export function getProviderStatus(): ProviderStatus {
  const provider = getActiveProvider();
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const gdKey = process.env.GODADDY_API_KEY;

  let configured = true;
  let message = 'Provider operational';

  if (provider.id === 'cloudflare' && (!cfToken || !cfAccount)) {
    configured = false;
    message = 'Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in environment variables';
  } else if (provider.id === 'godaddy' && !gdKey) {
    configured = false;
    message = 'Missing GODADDY_API_KEY in environment variables';
  } else if (provider.isMock) {
    message = 'Development mock mode active. Results are simulated.';
  } else if (provider.id === 'rdap') {
    message = 'Official ICANN RDAP registry mode active. Free, real-time registry checks.';
  }

  return {
    id: provider.id,
    name: provider.name,
    isMock: provider.isMock,
    configured,
    message,
  };
}
