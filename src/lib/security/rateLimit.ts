/**
 * Lightweight in-memory rate limiter for serverless Next.js API routes.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120; // 120 requests per minute per IP

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 30000);

export function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    rateLimitMap.set(clientIp, newEntry);
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}
