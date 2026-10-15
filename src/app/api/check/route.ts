import { NextRequest, NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/providers';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { BatchCheckResponse, DomainCheckResult } from '@/lib/types';

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export async function POST(req: NextRequest) {
  // Extract client IP for rate limiting
  const forwarded = req.headers.get('x-forwarded-for');
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait a moment before sending more batches.',
        results: [],
        checkedCount: 0,
        provider: 'System Rate Limiter',
        isMock: false,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString(),
        },
      }
    );
  }

  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.domains)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { domains: string[] }' },
        { status: 400 }
      );
    }

    const rawDomains: unknown[] = body.domains;

    if (rawDomains.length === 0) {
      return NextResponse.json(
        { error: 'Domains array cannot be empty' },
        { status: 400 }
      );
    }

    // Maximum batch size constraint (enforced to 20 per Cloudflare API specs)
    if (rawDomains.length > 20) {
      return NextResponse.json(
        { error: 'Maximum batch size is 20 domains per request' },
        { status: 400 }
      );
    }

    // Sanitize and validate domains
    const validDomains: string[] = [];
    const invalidResults: DomainCheckResult[] = [];
    const seen = new Set<string>();

    for (const item of rawDomains) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim().toLowerCase();

      if (trimmed.length > 253 || !DOMAIN_REGEX.test(trimmed)) {
        invalidResults.push({
          domain: trimmed,
          status: 'UNSUPPORTED',
          price: null,
          currency: null,
          premium: null,
          checkedAt: new Date().toISOString(),
          provider: 'Validator',
          reason: 'Domain name syntax is invalid under RFC standards',
        });
        continue;
      }

      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        validDomains.push(trimmed);
      }
    }

    const provider = getActiveProvider();
    let checkedResults: DomainCheckResult[] = [];

    if (validDomains.length > 0) {
      checkedResults = await provider.checkBatch(validDomains);
    }

    const allResults = [...checkedResults, ...invalidResults];

    const responseData: BatchCheckResponse = {
      results: allResults,
      checkedCount: allResults.length,
      provider: provider.name,
      isMock: provider.isMock,
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: `Availability check failed: ${message}` },
      { status: 500 }
    );
  }
}
