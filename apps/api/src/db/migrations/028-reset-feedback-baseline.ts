import type { Migration } from "../migrator.js";

/**
 * Starts feedback over for the triage release. The reports filed before it were mirrored to
 * GitHub (issues #5411–#5419 in production), which remains their record; keeping them here would
 * leave reports with no triage history and reporters who could never be notified about them.
 * Ids restart at 1 so the new numbering cannot be mistaken for the old one.
 */
export const resetFeedbackBaseline: Migration = {
  id: "028-reset-feedback-baseline",
  up: async (db) => {
    // Referencing tables first. DELETE rather than TRUNCATE: feedback_reports points at itself
    // (duplicate_of_id), which TRUNCATE would need CASCADE for, and the tables are tiny.
    for (const table of ["feedback_status_events", "notifications", "feedback_reports"]) {
      await db.query(`DELETE FROM ${table}`);
      // The test database (pg-mem) has no named serial sequences; Postgres always does.
      const sequence = `${table}_id_seq`;
      const { rows } = await db.query("SELECT 1 FROM pg_class WHERE relkind='S' AND relname=$1", [sequence]);
      if (rows.length) await db.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
    }
    await db.query("UPDATE accounts SET confirmed_bug_reports = 0 WHERE confirmed_bug_reports <> 0");
  },
};
