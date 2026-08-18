import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { PRE_MIGRATION_DDL } from "../preMigrationSchema.fixture.js";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ACCOUNT = "00000000-0000-0000-0000-0000000000aa";
const TOURNAMENT = "00000000-0000-0000-0000-0000000000bb";

async function migrated(): Promise<Pool> {
  const pool = createMemoryPool();
  expect(await runMigrations(pool, migrations)).toContain("009-top-cut");
  return pool;
}

async function seedTournament(pool: Pool): Promise<void> {
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1)", [ACCOUNT]);
  await pool.query(
    "INSERT INTO tournaments (id,name,block,status,starts_at,max_players,created_by,created_at) VALUES ($1,'Cup','BT10','in_progress',1,16,$2,1)",
    [TOURNAMENT, ACCOUNT],
  );
}

async function seedPhase(pool: Pool, order: number, roundOffset?: number): Promise<string> {
  const id = randomUUID();
  await pool.query(
    roundOffset === undefined
      ? "INSERT INTO tournament_phases (id,tournament_id,kind,phase_order,status,planned_rounds,created_at) VALUES ($1,$2,'swiss',$3,'running',3,1)"
      : `INSERT INTO tournament_phases (id,tournament_id,kind,phase_order,status,planned_rounds,round_offset,created_at)
         VALUES ($1,$2,'top_cut',$3,'running',3,${roundOffset},1)`,
    [id, TOURNAMENT, order],
  );
  return id;
}

async function seedParticipant(pool: Pool): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO tournament_participants (id, tournament_id, kind, account_id, display_name, status, created_at)
     VALUES ($1,$2,'human',$3,'Alice','active',1)`,
    [id, TOURNAMENT, ACCOUNT],
  );
  return id;
}

describe("009-top-cut", () => {
  it("creates the standings snapshot table and the cut-seed column", async () => {
    const pool = await migrated();
    expect((await pool.query("SELECT * FROM tournament_standings_snapshots")).rows).toEqual([]);
    await seedTournament(pool);
    const participantId = await seedParticipant(pool);
    expect(
      (await pool.query("SELECT top_cut_seed FROM tournament_participants WHERE id=$1", [participantId])).rows[0],
    ).toEqual({ top_cut_seed: null });
  });

  it("defaults every existing phase to a zero round offset, so nothing already numbered moves", async () => {
    const pool = createMemoryPool();
    // A database that already ran migration 006 and has a phase in it, upgraded afterwards.
    await pool.query(PRE_MIGRATION_DDL);
    await runMigrations(pool, migrations);
    await seedTournament(pool);
    const phaseId = await seedPhase(pool, 0);
    expect((await pool.query("SELECT round_offset FROM tournament_phases WHERE id=$1", [phaseId])).rows[0]).toEqual({
      round_offset: 0,
    });
  });

  it("keeps one snapshot row per participant per phase, so a repeated freeze adds nothing", async () => {
    const pool = await migrated();
    await seedTournament(pool);
    const phaseId = await seedPhase(pool, 0);
    const participantId = await seedParticipant(pool);
    const insert = `INSERT INTO tournament_standings_snapshots
       (id, tournament_id, phase_id, participant_id, rank, points, match_win_rate, opponent_match_win_rate,
        wins, losses, draws, byes, eligible, cut_seed, frozen_at)
     VALUES ($1,$2,$3,$4,1,9,1.0,0.5,3,0,0,0,true,1,100)
     ON CONFLICT (phase_id, participant_id) DO NOTHING`;
    await pool.query(insert, [randomUUID(), TOURNAMENT, phaseId, participantId]);
    await pool.query(insert, [randomUUID(), TOURNAMENT, phaseId, participantId]);
    expect(Number((await pool.query("SELECT COUNT(*) count FROM tournament_standings_snapshots")).rows[0].count)).toBe(
      1,
    );
  });

  it("lets a second phase reuse a round number by offsetting it past the first", async () => {
    const pool = await migrated();
    await seedTournament(pool);
    const swiss = await seedPhase(pool, 0);
    const cut = await seedPhase(pool, 1, 4);
    const insertMatch = `INSERT INTO tournament_matches (id, tournament_id, phase_id, round, position, status)
       VALUES ($1,$2,$3,$4,0,'waiting')`;
    await pool.query(insertMatch, [randomUUID(), TOURNAMENT, swiss, 1]);
    // Round 1 of the cut is stored as round 5, which is what keeps it out of the way of the Swiss
    // phase's `(tournament_id, round, position)` key.
    await pool.query(insertMatch, [randomUUID(), TOURNAMENT, cut, 5]);
    expect(Number((await pool.query("SELECT COUNT(*) count FROM tournament_matches")).rows[0].count)).toBe(2);
    await expect(pool.query(insertMatch, [randomUUID(), TOURNAMENT, cut, 1])).rejects.toThrow(/unique/i);
  });
});
