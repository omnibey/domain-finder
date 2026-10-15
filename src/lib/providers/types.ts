import { DomainCheckResult } from '../types';

export interface DomainProvider {
  id: string;
  name: string;
  isMock: boolean;
  maxBatchSize: number;
  checkBatch(domains: string[]): Promise<DomainCheckResult[]>;
  isTldSupported(tld: string): boolean;
}

export interface ProviderStatus {
  id: string;
  name: string;
  isMock: boolean;
  configured: boolean;
  message?: string;
}
