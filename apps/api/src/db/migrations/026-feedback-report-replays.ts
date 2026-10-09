import type { Migration } from "../migrator.js";

/**
 * The private match replay copied out of the logs when a report is filed from inside a match. The
 * logs are pruned after 12 hours, so the report keeps its own copy; the record carries both decks
 * and every action, so it never leaves this table except through the admin download.
 */
export const feedbackReportReplays: Migration = {
  id: "026-feedback-report-replays",
  up: `
    CREATE TABLE feedback_report_replays (
      report_id integer PRIMARY KEY REFERENCES feedback_reports(id) ON DELETE CASCADE,
      record jsonb NOT NULL,
      input_count integer NOT NULL,
      created_at bigint NOT NULL
    )
  `,
};
