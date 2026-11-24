import type { Migration } from "#api/db/migrator";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS feedback_investigators (
     feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
     account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     created_at bigint NOT NULL,
     PRIMARY KEY (feedback_id, account_id)
   )`,
  `CREATE TABLE IF NOT EXISTS feedback_investigation_notes (
     id serial PRIMARY KEY,
     feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
     account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
     body text NOT NULL,
     created_at bigint NOT NULL
   )`,
  "CREATE INDEX IF NOT EXISTS feedback_investigation_notes_feedback_idx ON feedback_investigation_notes(feedback_id, id)",
];

export const bugVolunteers: Migration = {
  id: "062-bug-volunteers",
  up: async (db) => {
    for (const statement of STATEMENTS) {
      await db.query(statement);
    }
  },
};
