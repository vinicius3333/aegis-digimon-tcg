import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

describe("011-game-deck-snapshots", () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(pool, migrations);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("applies in order after the migrations that precede it", async () => {
    expect(await runMigrations(pool, migrations)).toEqual([]);
    const ids = migrations.map((migration) => migration.id);
    expect(ids).toContain("011-game-deck-snapshots");
    expect([...ids].sort()).toEqual(ids);
  });

  it("stores a per-seat deck on the game and leaves it null until a seat is claimed", async () => {
    const matchId = randomUUID();
    const seriesId = randomUUID();
    const gameId = randomUUID();
    const accountId = randomUUID();
    const tournamentId = randomUUID();
    await pool.query("INSERT INTO accounts (id, display_name, avatar_url, created_at) VALUES ($1,'Organizer',null,1)", [
      accountId,
    ]);
    await pool.query(
      `INSERT INTO tournaments (id, name, block, starts_at, max_players, status, created_by, created_at)
       VALUES ($1,'Regional','BT10',1,8,'running',$2,1)`,
      [tournamentId, accountId],
    );
    await pool.query(
      `INSERT INTO tournament_matches (id, tournament_id, round, position, status) VALUES ($1,$2,1,0,'pending')`,
      [matchId, tournamentId],
    );
    await pool.query(
      `INSERT INTO match_series (id, tournament_match_id, wins_required, status, started_at) VALUES ($1,$2,2,'playing',1)`,
      [seriesId, matchId],
    );
    await pool.query(
      `INSERT INTO tournament_games (id, series_id, game_index, status, allocated_at) VALUES ($1,$2,1,'allocated',1)`,
      [gameId, seriesId],
    );

    const fresh = await pool.query("SELECT player0_deck_snapshot, player1_deck_snapshot FROM tournament_games");
    expect(fresh.rows[0]).toEqual({ player0_deck_snapshot: null, player1_deck_snapshot: null });

    await pool.query("UPDATE tournament_games SET player0_deck_snapshot=$1 WHERE id=$2", [
      JSON.stringify({ mainDeck: ["BT1-001"] }),
      gameId,
    ]);
    const stored = (
      await pool.query<{ player0_deck_snapshot: unknown }>("SELECT player0_deck_snapshot FROM tournament_games")
    ).rows[0]!.player0_deck_snapshot;
    const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
    expect(parsed).toEqual({ mainDeck: ["BT1-001"] });
  });
});
