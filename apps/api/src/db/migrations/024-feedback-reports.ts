import type { Migration } from "../migrator.js";

export const feedbackReports: Migration = {
  id: "024-feedback-reports",
  up: `
    CREATE TABLE feedback_reports (
      id serial PRIMARY KEY,
      reporter_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
      report jsonb NOT NULL,
      created_at bigint NOT NULL,
      github_status text NOT NULL CHECK (github_status IN ('pending', 'sent', 'failed', 'disabled')),
      github_number integer,
      github_url text
    )
  `,
};
