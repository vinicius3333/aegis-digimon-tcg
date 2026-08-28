import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { PRE_MIGRATION_DDL } from "../preMigrationSchema.fixture.js";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ACCOUNT_A = "00000000-0000-0000-0000-0000000000aa";
const ACCOUNT_B = "00000000-0000-0000-0000-0000000000ab";
const TOURNAMENT = "00000000-0000-0000-0000-0000000000bb";
const MATCH = "00000000-0000-0000-0000-0000000000cc";
const BOT = "00000000-0000-0000-0000-0000000000dd";

async function seedExistingData(pool: Pool): Promise<void> {
  await pool.query(PRE_MIGRATION_DDL);
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1)", [ACCOUNT_A]);
  await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Bob',1)", [ACCOUNT_B]);
  await pool.query(
    "INSERT INTO tournaments (id,name,block,status,starts_at,max_players,created_by,created_at) VALUES ($1,'Legacy Cup','BT10','registration',1,8,$2,1)",
    [TOURNAMENT, ACCOUNT_A],
  );
  await pool.query(
    "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,reason,finished_at) VALUES ('00000000-0000-0000-0000-0000000000ee','legacy-room','ranked',$1,$2,'security',5)",
    [ACCOUNT_A, ACCOUNT_B],
  );
}

describe("008-bot-participants", () => {
  it("applies on an empty database", async () => {
    const pool = createMemoryPool();
    expect(await runMigrations(pool, migrations)).toContain("008-bot-participants");
    expect((await pool.query("SELECT bot_profile, bot_deck_version FROM tournament_participants")).rows).toEqual([]);
  });

  it("reads every pre-existing match record back as a human opponent", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    expect((await pool.query("SELECT opponent_kind FROM match_records")).rows).toEqual([{ opponent_kind: "human" }]);
  });

  it("records a bot opponent as the human plus an empty second seat", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    await pool.query(
      "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,winner_account_id,reason,finished_at,opponent_kind) VALUES ('00000000-0000-0000-0000-0000000000ef','bot-room','tournament',$1,NULL,$1,'security',6,'bot')",
      [ACCOUNT_A],
    );
    expect(
      (await pool.query("SELECT player1_account_id, opponent_kind FROM match_records WHERE room_id='bot-room'"))
        .rows[0],
    ).toEqual({ player1_account_id: null, opponent_kind: "bot" });
  });

  it("refuses an opponent kind that is neither human nor bot", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    await expect(
      pool.query(
        "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,reason,finished_at,opponent_kind) VALUES ('00000000-0000-0000-0000-0000000000f0','x','ranked',$1,$2,'security',7,'alien')",
        [ACCOUNT_A, ACCOUNT_B],
      ),
    ).rejects.toThrow(/check/i);
  });

  it("seats a bot participant in a match through the participant columns", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    await pool.query(
      "INSERT INTO tournament_participants (id,tournament_id,kind,account_id,display_name,status,created_at,bot_profile,bot_deck_version) VALUES ($1,$2,'bot',NULL,'Agumon Unit','active',1,'aggressive','red-hybrid@1')",
      [BOT, TOURNAMENT],
    );
    await pool.query(
      "INSERT INTO tournament_matches (id,tournament_id,round,position,status,player1_participant_id) VALUES ($1,$2,1,0,'pending',$3)",
      [MATCH, TOURNAMENT, BOT],
    );
    expect(
      (
        await pool.query(
          "SELECT player0_account_id, player0_participant_id, player1_participant_id FROM tournament_matches WHERE id=$1",
          [MATCH],
        )
      ).rows[0],
    ).toEqual({ player0_account_id: null, player0_participant_id: null, player1_participant_id: BOT });
    expect(
      (await pool.query("SELECT bot_profile, bot_deck_version FROM tournament_participants WHERE id=$1", [BOT]))
        .rows[0],
    ).toEqual({ bot_profile: "aggressive", bot_deck_version: "red-hybrid@1" });
  });

  it("lets a tournament be cancelled without invalidating any status that was already legal", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    await pool.query("UPDATE tournaments SET status='cancelled' WHERE id=$1", [TOURNAMENT]);
    expect((await pool.query("SELECT status FROM tournaments WHERE id=$1", [TOURNAMENT])).rows[0]).toEqual({
      status: "cancelled",
    });
    for (const status of ["registration", "in_progress", "finished"])
      await pool.query("UPDATE tournaments SET status=$1 WHERE id=$2", [status, TOURNAMENT]);
    expect((await pool.query("SELECT status FROM tournaments WHERE id=$1", [TOURNAMENT])).rows[0]).toEqual({
      status: "finished",
    });
  });

  it("still refuses a status that is not a status", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    await expect(pool.query("UPDATE tournaments SET status='banana' WHERE id=$1", [TOURNAMENT])).rejects.toThrow(
      /check/i,
    );
  });

  it("records who won by seat, so a loss to an account-less opponent is not a draw", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    // The pre-existing row had two human seats and player0 winning nothing: it backfills to a draw,
    // which is exactly what it always meant.
    expect((await pool.query("SELECT outcome FROM match_records WHERE room_id='legacy-room'")).rows[0]).toEqual({
      outcome: "draw",
    });
    await pool.query(
      "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,winner_account_id,reason,finished_at,opponent_kind,outcome,opponent_display_name) VALUES ('00000000-0000-0000-0000-0000000000f1','lost-to-bot','tournament',$1,NULL,NULL,'security',9,'bot','player1','Agumon Unit')",
      [ACCOUNT_A],
    );
    expect(
      (await pool.query("SELECT outcome, opponent_display_name FROM match_records WHERE room_id='lost-to-bot'"))
        .rows[0],
    ).toEqual({ outcome: "player1", opponent_display_name: "Agumon Unit" });
  });

  it("is a no-op when applied twice", async () => {
    const pool = createMemoryPool();
    await seedExistingData(pool);
    await runMigrations(pool, migrations);
    await pool.query("DELETE FROM schema_migrations WHERE id='008-bot-participants'");
    expect(await runMigrations(pool, migrations)).toContain("008-bot-participants");
    expect((await pool.query("SELECT opponent_kind FROM match_records")).rows).toEqual([{ opponent_kind: "human" }]);
  });
});
