import type { Pool } from "pg";

const REPLAY_CLEANUP_LOCK_KEY = 1869113956;

export async function runReplayCleanupExclusively(pool: Pool, cleanup: () => Promise<void>): Promise<boolean> {
  const db = await pool.connect();
  let locked = false;
  try {
    const lock = await db.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [
      REPLAY_CLEANUP_LOCK_KEY,
    ]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) return false;
    await cleanup();
    return true;
  } finally {
    if (locked) await db.query("SELECT pg_advisory_unlock($1)", [REPLAY_CLEANUP_LOCK_KEY]);
    db.release();
  }
}
