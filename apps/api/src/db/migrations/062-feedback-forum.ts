import type { Migration } from "#api/db/migrator";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS feedback_votes (
     feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
     account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     verdict text NOT NULL CHECK (verdict IN ('yes', 'no')),
     reason text NOT NULL,
     created_at bigint NOT NULL,
     updated_at bigint NOT NULL,
     PRIMARY KEY (feedback_id, account_id)
   )`,
  `CREATE TABLE IF NOT EXISTS feedback_comments (
     id serial PRIMARY KEY,
     feedback_id integer NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
     account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
     body text NOT NULL,
     created_at bigint NOT NULL
   )`,
  "CREATE INDEX IF NOT EXISTS feedback_comments_feedback_idx ON feedback_comments(feedback_id, id)",
  "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS vote_payout text",
  "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS aegis_coins integer NOT NULL DEFAULT 0",
  "UPDATE accounts SET aegis_coins = confirmed_bug_reports WHERE confirmed_bug_reports > 0",
];

export const feedbackForum: Migration = {
  id: "062-feedback-forum",
  up: async (db) => {
    for (const statement of STATEMENTS) {
      await db.query(statement);
    }
  },
};
