import { RegistrarOption, RegistrarType } from './types';

export const REGISTRAR_OPTIONS: RegistrarOption[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    getUrl: (domain: string) =>
      `https://dash.cloudflare.com/?to=/:account/domains/register?query=${encodeURIComponent(domain)}`,
  },
  {
    id: 'hostinger',
    name: 'Hostinger',
    getUrl: (domain: string) =>
      `https://www.hostinger.com/domain-name-search?domain=${encodeURIComponent(domain)}`,
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    getUrl: (domain: string) =>
      `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
  },
  {
    id: 'godaddy',
    name: 'GoDaddy',
    getUrl: (domain: string) =>
      `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(domain)}`,
  },
];

export function getRegistrarUrl(registrarId: RegistrarType, domain: string): string {
  const reg = REGISTRAR_OPTIONS.find((r) => r.id === registrarId) || REGISTRAR_OPTIONS[0];
  return reg.getUrl(domain);
}
