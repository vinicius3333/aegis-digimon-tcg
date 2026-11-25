import type { Migration } from "#api/db/migrator";

type Database = Parameters<Extract<Migration["up"], (db: never) => unknown>>[0];

const TABLES = ["replay_markers", "replay_notes"] as const;

async function checkConstraintNames(db: Database, table: string): Promise<string[]> {
  try {
    const rows = await db.query<{ conname: string }>(
      "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE c.contype='c' AND t.relname=$1",
      [table],
    );
    return rows.rows.map((row) => row.conname);
  } catch {
    return [];
  }
}

export const replayFrameLimit: Migration = {
  id: "063-replay-frame-limit",
  up: async (db) => {
    for (const table of TABLES) {
      const named = await checkConstraintNames(db, table);
      const names =
        named.length > 0
          ? named
          : [`${table}_frame_index_check`, `${table}_turn_check`, `${table}_constraint_1`, `${table}_constraint_2`];
      for (const name of names) await db.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`);
      await db.query(
        `ALTER TABLE ${table} ADD CONSTRAINT ${table}_frame_index_check CHECK (frame_index BETWEEN 0 AND 19999)`,
      );
      await db.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_turn_check CHECK (turn BETWEEN 0 AND 10000)`);
    }
  },
};
