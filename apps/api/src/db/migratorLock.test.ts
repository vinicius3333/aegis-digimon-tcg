import { describe, expect, it } from "vitest";
import { createMemoryPool } from "./memoryPool.fixture.js";
import { migrations } from "./migrations/index.js";
import { type AcquireLock, acquireAdvisoryLock, runMigrations } from "./migrator.js";

/**
 * In-process stand-in for `pg_advisory_lock`. pg-mem has no advisory locks, so this is what a
 * concurrency test can actually assert against: it proves `runMigrations` holds one lock across
 * the entire read-pending/apply/record sequence and releases it afterwards. It does not prove
 * anything about Postgres's own lock — that contract belongs to the database, not to this code.
 */
function serializingLock(events?: string[]): AcquireLock {
  let tail: Promise<void> = Promise.resolve();
  return async () => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    events?.push("acquire");
    return async () => {
      events?.push("release");
      release();
    };
  };
}

const noLock: AcquireLock = async () => async () => undefined;

async function appliedIds(pool: ReturnType<typeof createMemoryPool>): Promise<string[]> {
  return (await pool.query<{ id: string }>("SELECT id FROM schema_migrations ORDER BY id")).rows.map((row) => row.id);
}

const ALL_IDS = [...migrations.map((migration) => migration.id)].sort();

describe("runMigrations locking", () => {
  it("serializes concurrent runs so every migration applies exactly once", async () => {
    const pool = createMemoryPool();
    const lock = serializingLock();
    const [first, second] = await Promise.all([
      runMigrations(pool, migrations, lock),
      runMigrations(pool, migrations, lock),
    ]);
    expect([first, second].flat().sort()).toEqual(ALL_IDS);
    expect(await appliedIds(pool)).toEqual(ALL_IDS);
  });

  it("characterizes an unlocked concurrent run as the double-apply the lock prevents", async () => {
    const pool = createMemoryPool();
    const results = await Promise.allSettled([
      runMigrations(pool, migrations, noLock),
      runMigrations(pool, migrations, noLock),
    ]);
    expect(results.some((result) => result.status === "rejected")).toBe(true);
  });

  it("holds the lock across the whole run and releases it when a migration fails", async () => {
    const pool = createMemoryPool();
    const events: string[] = [];
    const lock = serializingLock(events);
    await runMigrations(pool, [{ id: "001-a", up: "CREATE TABLE probe (id text PRIMARY KEY)" }], lock);
    await expect(runMigrations(pool, [{ id: "001-b", up: "SELECT * FROM missing_table" }], lock)).rejects.toThrow(
      "migration 001-b failed",
    );
    expect(events).toEqual(["acquire", "release", "acquire", "release"]);
  });

  it("falls back to no locking on a server without advisory locks", async () => {
    const pool = createMemoryPool();
    const release = await acquireAdvisoryLock(pool);
    await expect(release()).resolves.toBeUndefined();
    expect(await runMigrations(pool, migrations)).toEqual(migrations.map((migration) => migration.id));
  });
});
