import type { Migration } from "../migrator.js";

const STATEMENTS = [
  "ALTER TABLE match_records ADD COLUMN IF NOT EXISTS result_effect_key text",
  "CREATE UNIQUE INDEX IF NOT EXISTS match_records_result_effect_key ON match_records(result_effect_key) WHERE result_effect_key IS NOT NULL",
  `CREATE TABLE IF NOT EXISTS tournament_deadline_compensations (
     series_id uuid NOT NULL REFERENCES match_series(id) ON DELETE CASCADE,
     transfer_id text NOT NULL CHECK (transfer_id <> ''),
     paused_at_ms bigint NOT NULL,
     resumed_at_ms bigint NOT NULL,
     compensated_ms bigint NOT NULL CHECK (compensated_ms >= 0),
     created_at bigint NOT NULL,
     PRIMARY KEY (series_id, transfer_id),
     CHECK (resumed_at_ms >= paused_at_ms)
   )`,
];

export const handoffEffects: Migration = {
  id: "017-handoff-effects",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
