import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ALICE = "00000000-0000-4000-8000-0000000000a1";

describe("063-replay-frame-limit", () => {
  let pool: Pool;
  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(pool, migrations);
    await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1)", [ALICE]);
  });
  afterEach(async () => {
    await pool.end();
  });

  const marker = (id: string, frameIndex: number, turn = 1) =>
    pool.query(
      "INSERT INTO replay_markers (id,author_id,match_id,frame_index,turn,emoji,created_at) VALUES ($1,$2,'match',$3,$4,'🔥',1)",
      [id, ALICE, frameIndex, turn],
    );
  const note = (id: string, frameIndex: number) =>
    pool.query(
      "INSERT INTO replay_notes (id,author_id,match_id,frame_index,turn,body,created_at,updated_at) VALUES ($1,$2,'match',$3,1,'note',1,1)",
      [id, ALICE, frameIndex],
    );

  it("accepts markers and notes up to frame 19999 and still refuses frames and turns past the limits", async () => {
    await marker("00000000-0000-4000-8000-000000000001", 19999);
    await note("00000000-0000-4000-8000-000000000002", 19999);

    await expect(marker("00000000-0000-4000-8000-000000000003", 20000)).rejects.toThrow(/check/i);
    await expect(note("00000000-0000-4000-8000-000000000004", 20000)).rejects.toThrow(/check/i);
    await expect(marker("00000000-0000-4000-8000-000000000005", -1)).rejects.toThrow(/check/i);
    await expect(marker("00000000-0000-4000-8000-000000000006", 1, 10001)).rejects.toThrow(/check/i);
  });
});
