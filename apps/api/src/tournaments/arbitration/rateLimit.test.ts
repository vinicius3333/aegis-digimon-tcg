import { describe, expect, it } from "vitest";
import { tokenBucketLimiter } from "./rateLimit.js";

describe("tokenBucketLimiter", () => {
  it("allows a burst up to the capacity and refuses the next", () => {
    const limit = tokenBucketLimiter({ capacity: 3, refillMs: 1_000 });
    expect([limit("a", 0), limit("a", 0), limit("a", 0), limit("a", 0)]).toEqual([true, true, true, false]);
  });

  it("refills one token per interval", () => {
    const limit = tokenBucketLimiter({ capacity: 2, refillMs: 1_000 });
    limit("a", 0);
    limit("a", 0);
    expect(limit("a", 999)).toBe(false);
    expect(limit("a", 1_000)).toBe(true);
    expect(limit("a", 1_000)).toBe(false);
  });

  it("carries the fractional remainder, so polling faster than the interval still refills", () => {
    const limit = tokenBucketLimiter({ capacity: 1, refillMs: 1_000 });
    limit("a", 0);
    for (let at = 100; at < 1_000; at += 100) expect(limit("a", at)).toBe(false);
    expect(limit("a", 1_000)).toBe(true);
  });

  it("counts each caller separately", () => {
    const limit = tokenBucketLimiter({ capacity: 1, refillMs: 1_000 });
    expect(limit("a", 0)).toBe(true);
    expect(limit("b", 0)).toBe(true);
    expect(limit("a", 0)).toBe(false);
  });

  it("forgets a caller whose bucket has fully refilled", () => {
    const limit = tokenBucketLimiter({ capacity: 2, refillMs: 1_000 });
    limit("idle", 0);
    limit("other", 10_000);
    expect(limit("idle", 10_000)).toBe(true);
  });
});
