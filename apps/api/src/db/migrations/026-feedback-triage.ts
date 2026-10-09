import type { Migration } from "../migrator.js";

export const feedbackTriage: Migration = {
  id: "026-feedback-triage",
  up: async (db) => {
    await db.query(`
      ALTER TABLE feedback_reports
        ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new'
          CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'wont_fix', 'duplicate'))
    `);
    await db.query("ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS final_reply text");
    await db.query("ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS internal_note text");
    await db.query(
      "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS duplicate_of_id integer REFERENCES feedback_reports(id) ON DELETE SET NULL",
    );
    // Bumped on every save, so two people editing one report cannot silently overwrite each other.
    await db.query("ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0");
    // When the report last entered a closed status; the reporter's reopen window counts from here.
    await db.query("ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS closed_at bigint");
    // Set once, when the reporter reopens it. A report can be reopened by its reporter only once.
    await db.query("ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS reopened_at bigint");
    // An admin's judgment that the report describes a real bug, independent of its status.
    await db.query(
      "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS confirmed_bug boolean NOT NULL DEFAULT false",
    );
    // Kept in step with confirmed_bug in the same transaction, so showing it never counts rows.
    await db.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS confirmed_bug_reports integer NOT NULL DEFAULT 0");
    await db.query(
      "CREATE INDEX IF NOT EXISTS feedback_reports_reporter_idx ON feedback_reports (reporter_account_id, id)",
    );
    await db.query("CREATE INDEX IF NOT EXISTS feedback_reports_status_idx ON feedback_reports (status, id)");
    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback_status_events (
        id serial PRIMARY KEY,
        feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
        actor_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
        from_status text NOT NULL,
        to_status text NOT NULL,
        by_reporter boolean NOT NULL DEFAULT false,
        comment text,
        created_at bigint NOT NULL
      )
    `);
    await db.query(
      "CREATE INDEX IF NOT EXISTS feedback_status_events_feedback_idx ON feedback_status_events (feedback_id, id)",
    );
    // Generic on purpose: the feedback lifecycle is the first producer, not the only one. `subject`
    // names what a notification is about, so a newer unread update can replace an older one.
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id serial PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        kind text NOT NULL,
        subject text NOT NULL,
        payload jsonb NOT NULL,
        created_at bigint NOT NULL,
        read_at bigint
      )
    `);
    await db.query("CREATE INDEX IF NOT EXISTS notifications_account_idx ON notifications (account_id, id)");
  },
};
