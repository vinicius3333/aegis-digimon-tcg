import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { PRE_MIGRATION_DDL } from "../preMigrationSchema.fixture.js";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ACCOUNT_A = "00000000-0000-0000-0000-0000000000aa";
const ACCOUNT_B = "00000000-0000-0000-0000-0000000000ab";
const TOURNAMENT = "00000000-0000-0000-0000-0000000000bb";

async function seedExistingRegistrations(pool: Pool): Promise<void> {
  await pool.query(PRE_MIGRATION_DDL);
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1)", [ACCOUNT_A]);
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Bob',1)", [ACCOUNT_B]);
  await pool.query(
    "INSERT INTO tournaments (id,name,block,status,starts_at,max_players,created_by,created_at) VALUES ($1,'Legacy Cup','BT10','registration',1,8,$2,1)",
    [TOURNAMENT, ACCOUNT_A],
  );
  await pool.query(
    "INSERT INTO tournament_registrations (tournament_id,account_id,seed,created_at) VALUES ($1,$2,1,10)",
    [TOURNAMENT, ACCOUNT_A],
  );
  await pool.query("INSERT INTO tournament_registrations (tournament_id,account_id,created_at) VALUES ($1,$2,20)", [
    TOURNAMENT,
    ACCOUNT_B,
  ]);
}

async function participantRows(pool: Pool): Promise<Record<string, unknown>[]> {
  return (
    await pool.query(
      "SELECT account_id, kind, display_name, seed, status, deck_snapshot, deck_version, created_at, checked_in_at, dropped_at FROM tournament_participants ORDER BY created_at",
    )
  ).rows;
}

describe("004-tournament-participants", () => {
  it("creates the participant table and the window columns on an empty database", async () => {
    const pool = createMemoryPool();
    expect(await runMigrations(pool, migrations)).toContain("004-tournament-participants");
    expect(await participantRows(pool)).toEqual([]);
    expect(
      (await pool.query("SELECT registration_closes_at, check_in_opens_at, check_in_closes_at FROM tournaments")).rows,
    ).toEqual([]);
  });

  it("copies legacy registrations forward as registered human participants", async () => {
    const pool = createMemoryPool();
    await seedExistingRegistrations(pool);
    await runMigrations(pool, migrations);
    expect(await participantRows(pool)).toEqual([
      {
        account_id: ACCOUNT_A,
        kind: "human",
        display_name: "Alice",
        seed: 1,
        status: "registered",
        deck_snapshot: null,
        deck_version: null,
        created_at: 10,
        checked_in_at: null,
        dropped_at: null,
      },
      {
        account_id: ACCOUNT_B,
        kind: "human",
        display_name: "Bob",
        seed: null,
        status: "registered",
        deck_snapshot: null,
        deck_version: null,
        created_at: 20,
        checked_in_at: null,
        dropped_at: null,
      },
    ]);
  });

  it("leaves the legacy registrations table intact, because the bracket still reads it", async () => {
    const pool = createMemoryPool();
    await seedExistingRegistrations(pool);
    await runMigrations(pool, migrations);
    expect((await pool.query("SELECT COUNT(*) count FROM tournament_registrations")).rows[0]).toEqual({ count: 2 });
  });

  it("does not copy a registration twice when the participant row already exists", async () => {
    const pool = createMemoryPool();
    await seedExistingRegistrations(pool);
    await runMigrations(pool, migrations);
    await pool.query("DELETE FROM schema_migrations WHERE id='004-tournament-participants'");
    await runMigrations(pool, migrations);
    expect(await participantRows(pool)).toHaveLength(2);
  });

  it("leaves the new window columns null so an unscheduled tournament keeps its old behavior", async () => {
    const pool = createMemoryPool();
    await seedExistingRegistrations(pool);
    await runMigrations(pool, migrations);
    expect(
      (
        await pool.query(
          "SELECT registration_closes_at, check_in_opens_at, check_in_closes_at FROM tournaments WHERE id=$1",
          [TOURNAMENT],
        )
      ).rows[0],
    ).toEqual({ registration_closes_at: null, check_in_opens_at: null, check_in_closes_at: null });
  });

  it("keeps one participant row per human per tournament while allowing many account-less bots", async () => {
    const pool = createMemoryPool();
    await seedExistingRegistrations(pool);
    await runMigrations(pool, migrations);
    const insert = (id: string, accountId: string | null, kind: string) =>
      pool.query(
        "INSERT INTO tournament_participants (id,tournament_id,kind,account_id,display_name,status,created_at) VALUES ($1,$2,$3,$4,'X','registered',1)",
        [id, TOURNAMENT, kind, accountId],
      );
    // pg-mem names every unique violation after the primary key, so the constraint that actually
    // fired is identified by which inserts survive: a second row for an account already in the
    // tournament is refused, while account-less bots are not.
    await expect(insert("00000000-0000-0000-0000-0000000000c1", ACCOUNT_A, "human")).rejects.toThrow(
      /duplicate key value violates unique constraint/,
    );
    await insert("00000000-0000-0000-0000-0000000000c2", null, "bot");
    await insert("00000000-0000-0000-0000-0000000000c3", null, "bot");
    expect((await pool.query("SELECT COUNT(*) count FROM tournament_participants WHERE kind='bot'")).rows[0]).toEqual({
      count: 2,
    });
  });
});
