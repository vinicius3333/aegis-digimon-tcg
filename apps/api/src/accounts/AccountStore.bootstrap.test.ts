import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { AccountStore } from "./AccountStore.js";

/** Fails the first `failures` queries, then behaves normally. Stands in for a database that is
 *  still starting up when the first request arrives. */
function withEarlyFailures(pool: Pool, failures: number): Pool {
  const query = pool.query.bind(pool);
  let remaining = failures;
  return Object.assign(pool, {
    query: (...args: Parameters<typeof query>) =>
      remaining-- > 0 ? Promise.reject(new Error("database is starting up")) : query(...args),
  });
}

describe("AccountStore bootstrap", () => {
  it("retries the migrations after a failed first attempt instead of staying broken", async () => {
    const store = new AccountStore(withEarlyFailures(createMemoryPool(), 1) as never);
    await expect(store.decks("00000000-0000-0000-0000-0000000000aa")).rejects.toThrow("database is starting up");
    expect(await store.decks("00000000-0000-0000-0000-0000000000aa")).toEqual([]);
    const account = await store.accountForIdentity("discord", "recovered", "Recovered");
    expect(account.displayName).toBe("Recovered");
    await store.close();
  });

  it("runs the migrations once across concurrent first callers", async () => {
    const store = new AccountStore(createMemoryPool() as never);
    const [first, second] = await Promise.all([
      store.accountForIdentity("discord", "a", "A"),
      store.accountForIdentity("discord", "b", "B"),
    ]);
    expect(first.id).not.toBe(second.id);
    await store.close();
  });
});
