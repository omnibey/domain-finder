import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validatePattern,
  estimateCombinations,
  generateDomainCandidates,
  getDomainCandidatesBatch,
  resolveCharacterSet,
} from '../src/lib/pattern/generator';
import { generateCsv } from '../src/lib/export/csv';
import { MockProvider } from '../src/lib/providers/mock';
import { CloudflareProvider } from '../src/lib/providers/cloudflare';
import { GoDaddyProvider } from '../src/lib/providers/godaddy';
import { checkRateLimit } from '../src/lib/security/rateLimit';
import { DomainCheckResult, PatternConfig } from '../src/lib/types';

describe('Phase 10: Simple Domain Finder Comprehensive Test Suite', () => {
  // Test 1: Single-character patterns
  test('1. Single-character pattern (?mail.com) generates exactly 26 lowercase combinations', () => {
    const config: PatternConfig = { pattern: '?mail.com' };
    const estimate = estimateCombinations(config);

    assert.equal(estimate.valid, true);
    assert.equal(estimate.wildcardCount, 1);
    assert.equal(estimate.totalCombinations, 26);

    const candidates = Array.from(generateDomainCandidates(config));
    assert.equal(candidates.length, 26);
    assert.equal(candidates[0], 'amail.com');
    assert.equal(candidates[1], 'bmail.com');
    assert.equal(candidates[25], 'zmail.com');
  });

  // Test 2: Two-character patterns
  test('2. Two-character pattern (??mail.com) generates exactly 676 combinations', () => {
    const config: PatternConfig = { pattern: '??mail.com' };
    const estimate = estimateCombinations(config);

    assert.equal(estimate.valid, true);
    assert.equal(estimate.wildcardCount, 2);
    assert.equal(estimate.totalCombinations, 676);

    const generator = generateDomainCandidates(config);
    const firstFive: string[] = [];
    for (let i = 0; i < 5; i++) {
      firstFive.push(generator.next().value as string);
    }
    assert.deepEqual(firstFive, [
      'aamail.com',
      'abmail.com',
      'acmail.com',
      'admail.com',
      'aemail.com',
    ]);
  });

  // Test 3: Three-character patterns
  test('3. Three-character pattern (???mail.com) calculates 17,576 combinations and streams incrementally', () => {
    const config: PatternConfig = { pattern: '???mail.com' };
    const estimate = estimateCombinations(config);

    assert.equal(estimate.valid, true);
    assert.equal(estimate.wildcardCount, 3);
    assert.equal(estimate.totalCombinations, 17576);
    assert.equal(estimate.isExcessive, true); // Warns for > 10,000 combinations
    assert.match(estimate.warning || '', /combinations/i);

    // Verify incremental stream does not crash memory
    const generator = generateDomainCandidates(config);
    const sample = generator.next().value;
    assert.equal(sample, 'aaamail.com');
  });

  // Test 4: Custom prefixes and suffixes
  test('4. Custom prefixes and suffixes work seamlessly with wildcards', () => {
    const config: PatternConfig = {
      pattern: '?app.com',
      prefix: 'get-',
      suffix: '-pro',
    };
    const candidates = Array.from(generateDomainCandidates(config));
    assert.equal(candidates.length, 26);
    assert.equal(candidates[0], 'get-aapp-pro.com');
    assert.equal(candidates[25], 'get-zapp-pro.com');
  });

  // Test 5: Different domain extensions
  test('5. Supports multiple domain extensions simultaneously', () => {
    const config: PatternConfig = {
      pattern: '?box',
      selectedTlds: ['.com', '.io', '.ai'],
    };
    const estimate = estimateCombinations(config);
    assert.equal(estimate.totalCombinations, 26 * 3);

    const candidates = Array.from(generateDomainCandidates(config));
    assert.equal(candidates.length, 78);
    assert.ok(candidates.includes('abox.com'));
    assert.ok(candidates.includes('abox.io'));
    assert.ok(candidates.includes('abox.ai'));
  });

  // Test 6: Invalid patterns
  test('6. Rejects invalid patterns with descriptive errors', () => {
    // Empty pattern
    const emptyResult = validatePattern({ pattern: '' });
    assert.equal(emptyResult.valid, false);

    // Pattern without wildcard
    const noWildcard = validatePattern({ pattern: 'google.com' });
    assert.equal(noWildcard.valid, false);
    assert.match(noWildcard.error || '', /wildcard/i);

    // Pattern with forbidden characters
    const forbiddenChars = validatePattern({ pattern: '?mail!@#.com' });
    assert.equal(forbiddenChars.valid, false);

    // Pattern starting with hyphen
    const startsHyphen = validatePattern({ pattern: '-?mail.com' });
    assert.equal(startsHyphen.valid, false);

    // Invalid TLD format
    const invalidTld = validatePattern({ pattern: '?mail.' });
    assert.equal(invalidTld.valid, false);
  });

  // Test 7: Duplicate candidates
  test('7. Eliminates duplicate candidates from generator stream', () => {
    const config: PatternConfig = {
      pattern: '?mail.com',
      characterSet: 'custom',
      customChars: 'aaaa', // user typed duplicate letters
    };
    const chars = resolveCharacterSet(config);
    assert.equal(chars.length, 1); // Deduplicated to ['a']

    const candidates = Array.from(generateDomainCandidates(config));
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0], 'amail.com');
  });

  // Test 8: API timeouts handling
  test('8. Handles provider timeouts gracefully and marks status as UNKNOWN (never AVAILABLE)', async () => {
    const mock = new MockProvider();
    const results = await mock.checkBatch(['test-unknown-domain.com']);

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'UNKNOWN');
    assert.equal(results[0].price, null);
    assert.ok(results[0].reason?.includes('timeout') || results[0].reason?.includes('failure'));
  });

  // Test 9: API rate limits
  test('9. In-memory rate limiter protects against rapid flooding', () => {
    const testIp = '192.168.1.99';
    // Consume rate limit allowance
    for (let i = 0; i < 120; i++) {
      checkRateLimit(testIp);
    }
    const blockedCheck = checkRateLimit(testIp);
    assert.equal(blockedCheck.allowed, false);
    assert.equal(blockedCheck.remaining, 0);
  });

  // Test 10: Premium domains
  test('10. Accurately identifies premium domains and returns premium status with price', async () => {
    const mock = new MockProvider();
    const results = await mock.checkBatch(['test-premium-diamond.com']);

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'PREMIUM');
    assert.equal(results[0].premium, true);
    assert.ok(results[0].price?.includes('$'));
  });

  // Test 11: Unsupported extensions
  test('11. Accurately marks unsupported domain extensions as UNSUPPORTED', async () => {
    const mock = new MockProvider();
    const results = await mock.checkBatch(['myapp.unsupportedfakeextension']);

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'UNSUPPORTED');
    assert.equal(results[0].price, null);
  });

  // Test 12: Stop-search functionality
  test('12. Incremental batching allows stopping search mid-stream without processing all items', () => {
    const config: PatternConfig = { pattern: '???mail.com' }; // 17,576 combinations
    let processedCount = 0;
    const shouldStopAt = 40;

    for (const domain of generateDomainCandidates(config)) {
      processedCount++;
      assert.ok(domain.endsWith('.com'));
      if (processedCount >= shouldStopAt) {
        break; // Simulate user clicking Stop Search
      }
    }

    assert.equal(processedCount, 40);
  });

  // Test 13: CSV export formatting
  test('13. Generates RFC 4180 compliant CSV export with all 5 mandatory columns', () => {
    const mockResults: DomainCheckResult[] = [
      {
        domain: 'amail.com',
        status: 'AVAILABLE',
        price: '$10.99/yr',
        currency: 'USD',
        premium: false,
        checkedAt: '2026-10-15T12:00:00.000Z',
        provider: 'Mock Provider',
      },
      {
        domain: 'rare.com',
        status: 'PREMIUM',
        price: '$2,500.00',
        currency: 'USD',
        premium: true,
        checkedAt: '2026-10-15T12:00:01.000Z',
        provider: 'Mock Provider',
      },
    ];

    const csv = generateCsv(mockResults);
    const lines = csv.split('\r\n');

    // Check header
    assert.equal(lines[0], 'Domain,Availability Status,Registration Price,Premium Status,Checked At');

    // Check item 1
    assert.equal(lines[1], 'amail.com,AVAILABLE,$10.99/yr,No,2026-10-15T12:00:00.000Z');

    // Check item 2 (price with comma properly quoted)
    assert.equal(lines[2], 'rare.com,PREMIUM,"$2,500.00",Yes,2026-10-15T12:00:01.000Z');
  });

  // Test 14: Missing API credentials handling
  test('14. Missing API credentials returns UNKNOWN status with informative error, never AVAILABLE', async () => {
    // Cloudflare with missing tokens
    const cf = new CloudflareProvider('', '');
    const cfResults = await cf.checkBatch(['testdomain.com']);
    assert.equal(cfResults[0].status, 'UNKNOWN');
    assert.match(cfResults[0].reason || '', /missing/i);

    // GoDaddy with missing keys
    const gd = new GoDaddyProvider('', '');
    const gdResults = await gd.checkBatch(['testdomain.com']);
    assert.equal(gdResults[0].status, 'UNKNOWN');
    assert.match(gdResults[0].reason || '', /missing/i);
  });

  // Test 15: Batch candidate slicer
  test('15. getDomainCandidatesBatch correctly paginates without memory bloat', () => {
    const config: PatternConfig = { pattern: '??mail.com' };
    const batch1 = getDomainCandidatesBatch(config, 0, 20);
    assert.equal(batch1.candidates.length, 20);
    assert.equal(batch1.done, false);

    const batch2 = getDomainCandidatesBatch(config, 20, 20);
    assert.equal(batch2.candidates.length, 20);
    assert.notEqual(batch1.candidates[0], batch2.candidates[0]);
  });
});
