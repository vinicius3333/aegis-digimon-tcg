import type { TokenBucketOptions } from "../../http/rateLimit.js";
export { tokenBucketLimiter } from "../../http/rateLimit.js";
export type { RateLimiter, TokenBucketOptions } from "../../http/rateLimit.js";

/** What the arbitration routes use: a short burst, then one command every few seconds. */
export const ARBITRATION_RATE_LIMIT: TokenBucketOptions = { capacity: 10, refillMs: 3_000 };
