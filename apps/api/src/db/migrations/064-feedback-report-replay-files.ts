import type { Migration } from "#api/db/migrator";

export const feedbackReportReplayFiles: Migration = {
  id: "064-feedback-report-replay-files",
  up: `
    CREATE TABLE IF NOT EXISTS feedback_report_replay_files (
      report_id integer PRIMARY KEY REFERENCES feedback_reports(id) ON DELETE CASCADE,
      archive bytea NOT NULL,
      byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 33554432),
      created_at bigint NOT NULL
    )
  `,
};
