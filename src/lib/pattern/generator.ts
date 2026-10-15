import { PatternConfig, PatternEstimate } from '../types';

export const DEFAULT_TLDS = ['.com', '.net', '.org', '.io', '.ai', '.co', '.dev', '.app'];

/**
 * Returns the sanitized character set array based on configuration.
 */
export function resolveCharacterSet(config: PatternConfig): string[] {
  let chars: string[] = [];

  if (config.characterSet === 'custom' && config.customChars) {
    // Only allow alphanumeric characters and hyphen in custom charset
    const sanitized = config.customChars
      .toLowerCase()
      .split('')
      .filter((c) => /[a-z0-9]/.test(c));
    // Unique characters
    chars = Array.from(new Set(sanitized));
  } else if (config.characterSet === 'alphanumeric' || config.allowNumbers) {
    chars = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
  } else {
    // Default: lowercase alphabet
    chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
  }

  if (chars.length === 0) {
    chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
  }

  return chars;
}

/**
 * Splits pattern into label portion and TLD portion.
 */
export function splitPattern(rawPattern: string): { labelPart: string; tldPart: string | null } {
  const trimmed = rawPattern.trim().toLowerCase();
  const firstDotIndex = trimmed.indexOf('.');

  if (firstDotIndex === -1) {
    return { labelPart: trimmed, tldPart: null };
  }

  return {
    labelPart: trimmed.slice(0, firstDotIndex),
    tldPart: trimmed.slice(firstDotIndex),
  };
}

/**
 * Validates a domain pattern configuration.
 */
export function validatePattern(config: PatternConfig): {
  valid: boolean;
  error?: string;
  wildcardCount: number;
} {
  const raw = config.pattern.trim();

  if (!raw) {
    return { valid: false, error: 'Please enter a domain pattern (e.g., ?mail.com)', wildcardCount: 0 };
  }

  const { labelPart, tldPart } = splitPattern(raw);

  if (!labelPart) {
    return { valid: false, error: 'Domain name label cannot be empty before the extension', wildcardCount: 0 };
  }

  // Count wildcards
  const wildcardMatches = labelPart.match(/\?/g);
  const wildcardCount = wildcardMatches ? wildcardMatches.length : 0;

  if (wildcardCount === 0) {
    return {
      valid: false,
      error: 'Pattern must contain at least one wildcard (?) character',
      wildcardCount: 0,
    };
  }

  // Check valid characters in label: letters, digits, hyphen, wildcard (?)
  const validLabelRegex = /^[a-z0-9\-?]+$/i;
  if (!validLabelRegex.test(labelPart)) {
    return {
      valid: false,
      error: 'Domain pattern label can only contain letters, numbers, hyphens, and "?" wildcards',
      wildcardCount,
    };
  }

  // Hyphen checks
  if (labelPart.startsWith('-') || labelPart.endsWith('-')) {
    return {
      valid: false,
      error: 'Domain pattern cannot start or end with a hyphen',
      wildcardCount,
    };
  }

  // Check TLD if provided in pattern
  if (tldPart !== null) {
    if (tldPart === '.' || !/^\.[a-z0-9-]+$/i.test(tldPart)) {
      return {
        valid: false,
        error: `Invalid domain extension "${tldPart}". Extensions must start with a dot followed by letters (e.g., .com)`,
        wildcardCount,
      };
    }
  } else if (!config.selectedTlds || config.selectedTlds.length === 0) {
    return {
      valid: false,
      error: 'No domain extension specified. Enter one in pattern (e.g., ?mail.com) or select an extension.',
      wildcardCount,
    };
  }

  // Label length check (DNS label maximum 63 characters)
  if (labelPart.length > 63) {
    return {
      valid: false,
      error: 'Domain label cannot exceed 63 characters',
      wildcardCount,
    };
  }

  return { valid: true, wildcardCount };
}

/**
 * Calculates estimated number of combinations, sample domains, and warnings.
 */
export function estimateCombinations(config: PatternConfig): PatternEstimate {
  const validation = validatePattern(config);
  const chars = resolveCharacterSet(config);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      totalCombinations: 0,
      wildcardCount: validation.wildcardCount,
      sampleDomains: [],
      isExcessive: false,
      characterSetUsed: chars.join(''),
    };
  }

  const { labelPart, tldPart } = splitPattern(config.pattern);
  const tlds = tldPart ? [tldPart] : (config.selectedTlds && config.selectedTlds.length > 0 ? config.selectedTlds : ['.com']);

  const baseCombinations = Math.pow(chars.length, validation.wildcardCount);
  const totalCombinations = baseCombinations * tlds.length;

  const isExcessive = totalCombinations > 10000;
  let warning: string | undefined;

  if (totalCombinations > 100000) {
    warning = `Warning: ${totalCombinations.toLocaleString()} combinations is very large. Consider reducing the number of '?' wildcards.`;
  } else if (totalCombinations > 10000) {
    warning = `Notice: ${totalCombinations.toLocaleString()} combinations will take several batches to complete.`;
  }

  // Generate up to 5 sample preview domains
  const sampleDomains: string[] = [];
  const generator = generateDomainCandidates(config);
  for (let i = 0; i < 5; i++) {
    const next = generator.next();
    if (next.done) break;
    sampleDomains.push(next.value);
  }

  return {
    valid: true,
    totalCombinations,
    wildcardCount: validation.wildcardCount,
    sampleDomains,
    isExcessive,
    warning,
    characterSetUsed: chars.join(''),
  };
}

/**
 * Incremental generator that yields domain candidates one by one.
 * Never constructs every combination in memory at once.
 */
export function* generateDomainCandidates(config: PatternConfig): Generator<string> {
  const validation = validatePattern(config);
  if (!validation.valid) return;

  const chars = resolveCharacterSet(config);
  const { labelPart, tldPart } = splitPattern(config.pattern);
  const tlds = tldPart ? [tldPart] : (config.selectedTlds && config.selectedTlds.length > 0 ? config.selectedTlds : ['.com']);

  // Apply optional fixed prefix and suffix if specified
  const effectivePrefix = config.prefix ? config.prefix.toLowerCase() : '';
  const effectiveSuffix = config.suffix ? config.suffix.toLowerCase() : '';
  const fullLabelTemplate = `${effectivePrefix}${labelPart}${effectiveSuffix}`;

  // Find all positions of wildcard '?'
  const wildcardIndices: number[] = [];
  for (let i = 0; i < fullLabelTemplate.length; i++) {
    if (fullLabelTemplate[i] === '?') {
      wildcardIndices.push(i);
    }
  }

  const k = wildcardIndices.length;
  if (k === 0) {
    for (const tld of tlds) {
      yield `${fullLabelTemplate}${tld}`;
    }
    return;
  }

  // Total combinations per TLD: chars.length ^ k
  const N = chars.length;
  const indices = new Array(k).fill(0);
  const total = Math.pow(N, k);

  const seen = new Set<string>();

  for (let count = 0; count < total; count++) {
    // Construct label with current characters
    const labelChars = fullLabelTemplate.split('');
    for (let w = 0; w < k; w++) {
      labelChars[wildcardIndices[w]] = chars[indices[w]];
    }
    const label = labelChars.join('');

    // Yield for each TLD
    for (const tld of tlds) {
      const fullDomain = `${label}${tld}`;
      if (!seen.has(fullDomain)) {
        seen.add(fullDomain);
        yield fullDomain;
      }
    }

    // Increment radix counter
    for (let pos = k - 1; pos >= 0; pos--) {
      indices[pos]++;
      if (indices[pos] < N) {
        break;
      }
      indices[pos] = 0;
    }
  }
}

/**
 * Returns a slice/batch of candidate domains starting from offset.
 */
export function getDomainCandidatesBatch(
  config: PatternConfig,
  offset: number,
  batchSize: number
): { candidates: string[]; done: boolean; totalYielded: number } {
  const generator = generateDomainCandidates(config);
  const candidates: string[] = [];
  let index = 0;
  let done = true;

  for (const domain of generator) {
    if (index >= offset && candidates.length < batchSize) {
      candidates.push(domain);
    }
    index++;
    if (candidates.length === batchSize) {
      done = false;
      break;
    }
  }

  return { candidates, done, totalYielded: index };
}
