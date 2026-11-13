import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { runReplayCleanupExclusively } from "#api/replays/runReplayCleanupExclusively";

function fakePool(lockGranted: boolean) {
  const queries: string[] = [];
  const release = vi.fn<() => void>();
  const pool = {
    connect: async () => ({
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [{ locked: lockGranted }] };
      },
      release,
    }),
  } as unknown as Pool;
  return { pool, queries, release };
}

describe("runReplayCleanupExclusively", () => {
  it("runs the cleanup and releases the lock when this instance gets it", async () => {
    const { pool, queries, release } = fakePool(true);
    const cleanup = vi.fn<() => Promise<void>>(async () => undefined);

    expect(await runReplayCleanupExclusively(pool, cleanup)).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(queries).toEqual(["SELECT pg_try_advisory_lock($1) AS locked", "SELECT pg_advisory_unlock($1)"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("skips the cleanup while another instance holds the lock", async () => {
    const { pool, queries, release } = fakePool(false);
    const cleanup = vi.fn<() => Promise<void>>(async () => undefined);

    expect(await runReplayCleanupExclusively(pool, cleanup)).toBe(false);
    expect(cleanup).not.toHaveBeenCalled();
    expect(queries).toEqual(["SELECT pg_try_advisory_lock($1) AS locked"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("releases the lock when the cleanup fails", async () => {
    const { pool, queries, release } = fakePool(true);

    await expect(
      runReplayCleanupExclusively(pool, async () => {
        throw new Error("deadlock detected");
      }),
    ).rejects.toThrow("deadlock detected");
    expect(queries.at(-1)).toBe("SELECT pg_advisory_unlock($1)");
    expect(release).toHaveBeenCalledOnce();
  });
});
