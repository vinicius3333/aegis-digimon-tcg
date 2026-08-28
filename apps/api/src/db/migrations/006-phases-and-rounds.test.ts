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

async function seedParticipant(pool: Pool, accountId: string): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO tournament_participants (id, tournament_id, kind, account_id, display_name, status, created_at)
     VALUES ($1,$2,'human',$3,'Player','active',1)`,
    [id, TOURNAMENT, accountId],
  );
  return id;
}

async function seedPhaseAndRound(pool: Pool): Promise<{ phaseId: string; roundId: string }> {
  const phaseId = randomUUID();
  const roundId = randomUUID();
  await pool.query(
    "INSERT INTO tournament_phases (id,tournament_id,kind,phase_order,status,planned_rounds,created_at) VALUES ($1,$2,'swiss',0,'running',3,1)",
    [phaseId, TOURNAMENT],
  );
  await pool.query(
    "INSERT INTO tournament_rounds (id,phase_id,number,status,published_at,score_difference,score_difference_optimal,budget_exhausted) VALUES ($1,$2,1,'published',100,4,true,false)",
    [roundId, phaseId],
  );
  return { phaseId, roundId };
}

describe("006-phases-and-rounds", () => {
  it("creates the phase, round and ledger tables on an empty database", async () => {
    const pool = createMemoryPool();
    expect(await runMigrations(pool, migrations)).toContain("006-phases-and-rounds");
    expect((await pool.query("SELECT * FROM tournament_phases")).rows).toEqual([]);
    expect((await pool.query("SELECT * FROM tournament_rounds")).rows).toEqual([]);
    expect((await pool.query("SELECT * FROM tournament_result_ledger")).rows).toEqual([]);
  });

  it("adds the phase, round and pairing columns to an existing legacy bracket without disturbing it", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    expect(
      (
        await pool.query(
          "SELECT room_id, status, phase_id, round_id, pairing_reason FROM tournament_matches WHERE id=$1",
          [MATCH],
        )
      ).rows[0],
    ).toEqual({ room_id: "legacy-room", status: "pending", phase_id: null, round_id: null, pairing_reason: null });
  });

  it("persists the pairing audit a round was published with", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    const { roundId } = await seedPhaseAndRound(pool);
    expect(
      (
        await pool.query(
          "SELECT number, status, published_at, closed_at, score_difference, score_difference_optimal, budget_exhausted FROM tournament_rounds WHERE id=$1",
          [roundId],
        )
      ).rows[0],
    ).toEqual({
      number: 1,
      status: "published",
      published_at: 100,
      closed_at: null,
      score_difference: 4,
      score_difference_optimal: true,
      budget_exhausted: false,
    });
  });

  it("lets one tournament hold at most one phase per order", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    await seedPhaseAndRound(pool);
    await expect(
      pool.query(
        "INSERT INTO tournament_phases (id,tournament_id,kind,phase_order,status,created_at) VALUES ($1,$2,'top_cut',0,'scheduled',1)",
        [randomUUID(), TOURNAMENT],
      ),
    ).rejects.toThrow(/constraint|unique|duplicate/i);
  });

  /**
   * The idempotency key the round-close sweep relies on: one participant, one round, one outcome.
   * Without it a retried sweep would count a result twice and no read could tell.
   */
  it("refuses a second ledger row for the same participant and round", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    const alice = await seedParticipant(pool, ACCOUNT);
    const bob = await seedParticipant(pool, OPPONENT);
    const insert = (outcome: string, opponent: string | null) =>
      pool.query(
        `INSERT INTO tournament_result_ledger (id,tournament_id,participant_id,opponent_id,opponent_kind,round_number,outcome,recorded_at)
         VALUES ($1,$2,$3,$4,$5,1,$6,10)`,
        [randomUUID(), TOURNAMENT, alice, opponent, opponent === null ? null : "human", outcome],
      );
    await expect(insert("win", bob)).resolves.toBeDefined();
    await expect(insert("loss", bob)).rejects.toThrow(/constraint|unique|duplicate/i);
    // A bye is the same row shape with no opponent, and the nullable CHECK must accept it.
    await expect(
      pool.query(
        `INSERT INTO tournament_result_ledger (id,tournament_id,participant_id,opponent_id,opponent_kind,round_number,outcome,recorded_at)
         VALUES ($1,$2,$3,NULL,NULL,2,'bye',10)`,
        [randomUUID(), TOURNAMENT, alice],
      ),
    ).resolves.toBeDefined();
  });

  it("rejects an outcome the standings projection does not know", async () => {
    const pool = createMemoryPool();
    await seedExistingBracket(pool);
    await runMigrations(pool, migrations);
    const alice = await seedParticipant(pool, ACCOUNT);
    await expect(
      pool.query(
        `INSERT INTO tournament_result_ledger (id,tournament_id,participant_id,opponent_id,opponent_kind,round_number,outcome,recorded_at)
         VALUES ($1,$2,$3,NULL,NULL,1,'vibes',10)`,
        [randomUUID(), TOURNAMENT, alice],
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
