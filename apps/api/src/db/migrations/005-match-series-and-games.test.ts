import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { PRE_MIGRATION_DDL } from "../preMigrationSchema.fixture.js";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ACCOUNT = "00000000-0000-0000-0000-0000000000aa";
const OPPONENT = "00000000-0000-0000-0000-0000000000ab";
const TOURNAMENT = "00000000-0000-0000-0000-0000000000bb";
const MATCH = "00000000-0000-0000-0000-0000000000cc";

async function seedExistingBracket(pool: Pool): Promise<void> {
  await pool.query(PRE_MIGRATION_DDL);
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1)", [ACCOUNT]);
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Bob',1)", [OPPONENT]);
  await pool.query(
    "INSERT INTO tournaments (id,name,block,status,starts_at,max_players,created_by,created_at) VALUES ($1,'Legacy Cup','BT10','in_progress',1,8,$2,1)",
    [TOURNAMENT, ACCOUNT],
  );
  await pool.query(
    "INSERT INTO tournament_matches (id,tournament_id,round,position,player0_account_id,player1_account_id,status,room_id) VALUES ($1,$2,1,0,$3,$4,'pending','legacy-room')",
    [MATCH, TOURNAMENT, ACCOUNT, OPPONENT],
  );
}

async function seedSeries(pool: Pool): Promise<{ seriesId: string; gameId: string }> {
  const seriesId = randomUUID();
  const gameId = randomUUID();
  await pool.query(
    "INSERT INTO match_series (id,tournament_match_id,wins_required,status,started_at,series_deadline_at) VALUES ($1,$2,2,'playing',100,3700)",
    [seriesId, MATCH],
  );
  await pool.query(
    "INSERT INTO tournament_games (id,series_id,game_index,status,allocated_at,room_id) VALUES ($1,$2,1,'room_claimed',100,'room-1')",
    [gameId, seriesId],
  );
  return { seriesId, gameId };
}

describe("005-match-series-and-games", () => {
  it("creates the series, game and authorization tables on an empty database", async () => {
    const pool = createMemoryPool();
    expect(await runMigrations(pool, migrations)).toContain("005-match-series-and-games");
    expect((await pool.query("SELECT * FROM match_series")).rows).toEqual([]);
    expect((await pool.query("SELECT * FROM tournament_games")).rows).toEqual([]);
    expect((await pool.query("SELECT * FROM tournament_game_authorizations")).rows).toEqual([]);
  });

  it("adds the join deadline and per-seat presence to an existing legacy bracket without disturbing it", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    expect(
      (
        await pool.query(
          "SELECT room_id, status, join_deadline_at, player0_present_at, player1_present_at FROM tournament_matches WHERE id=$1",
          [MATCH],
        )
      ).rows[0],
    ).toEqual({
      room_id: "legacy-room",
      status: "pending",
      join_deadline_at: null,
      player0_present_at: null,
      player1_present_at: null,
    });
  });

  it("lets one match own at most one series", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    await seedSeries(pool);
    await expect(
      pool.query(
        "INSERT INTO match_series (id,tournament_match_id,wins_required,status,started_at) VALUES ($1,$2,2,'playing',200)",
        [randomUUID(), MATCH],
      ),
    ).rejects.toThrow(/constraint|unique|duplicate/i);
  });

  it("lets one room be at most one game, and one game index appear once per series", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    const { seriesId } = await seedSeries(pool);
    await expect(
      pool.query(
        "INSERT INTO tournament_games (id,series_id,game_index,status,allocated_at,room_id) VALUES ($1,$2,2,'room_claimed',200,'room-1')",
        [randomUUID(), seriesId],
      ),
    ).rejects.toThrow(/constraint|unique|duplicate/i);
    await expect(
      pool.query(
        "INSERT INTO tournament_games (id,series_id,game_index,status,allocated_at) VALUES ($1,$2,1,'allocated',200)",
        [randomUUID(), seriesId],
      ),
    ).rejects.toThrow(/constraint|unique|duplicate/i);
  });

  /**
   * `game_index` counts games actually PLAYED, not slots out of three. A drawn or voided game
   * decides nothing and is replayed, so a fourth game is the ordinary record of a series that drew
   * one — the budget of decisive games is the series module's business, since only it knows
   * `wins_required`. What the column rejects is a nonsensical index.
   */
  it("allows a replay past the third game but rejects a nonsensical index", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    const { seriesId } = await seedSeries(pool);
    await expect(
      pool.query(
        "INSERT INTO tournament_games (id,series_id,game_index,status,allocated_at) VALUES ($1,$2,4,'allocated',200)",
        [randomUUID(), seriesId],
      ),
    ).resolves.toBeDefined();
    await expect(
      pool.query(
        "INSERT INTO tournament_games (id,series_id,game_index,status,allocated_at) VALUES ($1,$2,0,'allocated',200)",
        [randomUUID(), seriesId],
      ),
    ).rejects.toThrow(/constraint|check/i);
  });

  it("is a no-op when re-run", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    expect(await runMigrations(pool, migrations)).toEqual([]);
  });
});
