/**
 * CLIENT-SIDE RATE LIMITING
 * Prevents excessive API calls from the frontend
 * Server-side rate limiting should also be implemented in Supabase
 */

import { AppError } from "./errors";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // time window in milliseconds
}

export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   * @returns true if request should be allowed, false if rate limited
   */
  isAllowed(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => time > windowStart);

    // Check if we've exceeded the limit
    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    this.requests.push(now);
    return true;
  }

  /**
   * Get time until next request is allowed (in seconds)
   */
  getRetryAfter(): number {
    if (this.requests.length === 0) return 0;

    const oldestRequest = this.requests[0];
    const windowStart = oldestRequest + this.config.windowMs;
    const now = Date.now();
    const retryAfter = Math.ceil((windowStart - now) / 1000);

    return Math.max(0, retryAfter);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

// ==================== PREDEFINED RATE LIMITERS ====================

// General API calls: 10 requests per 60 seconds
export const generalLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
});

// Authentication: 5 attempts per 60 seconds
export const authLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60000,
});

// Document operations: 20 requests per 60 seconds
export const documentLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60000,
});

// Share link operations: 15 requests per 60 seconds
export const shareLinkLimiter = new RateLimiter({
  maxRequests: 15,
  windowMs: 60000,
});

// File uploads: 5 uploads per 300 seconds (5 minutes)
export const uploadLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 300000,
});

// File downloads: 30 downloads per 300 seconds (5 minutes)
export const downloadLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 300000,
});

// ==================== RATE LIMIT ERROR CLASS ====================
export class RateLimitError extends AppError {
  retryAfter: number;

  constructor(
    retryAfter: number,
    message: string = `Rate limit exceeded. Please try again in ${retryAfter} seconds`
  ) {
    super("RATE_LIMIT_EXCEEDED", 429, message);
    this.retryAfter = retryAfter;
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// ==================== RATE LIMIT MIDDLEWARE ====================
export function checkRateLimit(limiter: RateLimiter): void {
  if (!limiter.isAllowed()) {
    const retryAfter = limiter.getRetryAfter();
    throw new RateLimitError(retryAfter);
  }
}

// ==================== ASYNC RATE LIMIT CHECK ====================
export async function withRateLimit<T>(
  limiter: RateLimiter,
  fn: () => Promise<T>
): Promise<T> {
  checkRateLimit(limiter);
  return fn();
}
