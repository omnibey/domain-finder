export type DomainStatus =
  | 'AVAILABLE'
  | 'REGISTERED'
  | 'PREMIUM'
  | 'UNKNOWN'
  | 'UNSUPPORTED';

export interface DomainCheckResult {
  domain: string;
  status: DomainStatus;
  price: string | null;
  currency: string | null;
  premium: boolean | null; // null represents UNKNOWN premium status
  checkedAt: string; // ISO 8601 string
  provider: string;
  reason?: string;
}

export type CharsetType = 'lowercase' | 'alphanumeric' | 'custom';

export interface PatternConfig {
  pattern: string; // e.g., "?mail.com", "??mail.com", "my?app"
  allowNumbers?: boolean;
  characterSet?: CharsetType;
  customChars?: string;
  selectedTlds?: string[]; // e.g. [".com", ".net"]
  prefix?: string;
  suffix?: string;
}

export interface PatternEstimate {
  valid: boolean;
  error?: string;
  totalCombinations: number;
  wildcardCount: number;
  sampleDomains: string[];
  isExcessive: boolean;
  warning?: string;
  characterSetUsed: string;
}

export interface BatchCheckRequest {
  domains: string[];
}

export interface BatchCheckResponse {
  results: DomainCheckResult[];
  checkedCount: number;
  provider: string;
  isMock: boolean;
  error?: string;
}

export type RegistrarType = 'cloudflare' | 'hostinger' | 'namecheap' | 'godaddy';

export interface RegistrarOption {
  id: RegistrarType;
  name: string;
  getUrl: (domain: string) => string;
}
