export type RateLimiter = (key: string, now?: number) => boolean;

export type TokenBucketOptions = {
  capacity: number;
  refillMs: number;
};

/**
 * In-memory token bucket for low-risk operational throttling keyed by account or caller.
 * Blue/green instances have independent buckets, so this is not an authorization or security seam.
 */
export function tokenBucketLimiter(options: TokenBucketOptions): RateLimiter {
  const buckets = new Map<string, { tokens: number; updatedAt: number }>();
  const fullAgainAt = options.capacity * options.refillMs;
  return (key, now = Date.now()) => {
    for (const [other, bucket] of buckets)
      if (other !== key && now - bucket.updatedAt >= fullAgainAt) buckets.delete(other);
    const bucket = buckets.get(key) ?? { tokens: options.capacity, updatedAt: now };
    const earned = Math.floor(Math.max(0, now - bucket.updatedAt) / options.refillMs);
    const refilled = Math.min(options.capacity, bucket.tokens + earned);
    if (refilled < 1) return false;
    buckets.set(key, { tokens: refilled - 1, updatedAt: bucket.updatedAt + earned * options.refillMs });
    return true;
  };
}
