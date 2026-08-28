import type { Migration } from "../migrator.js";

// The two layers ABOVE `tournament_matches`, plus the immutable record standings are projected
// from. Migration 005 gave a match everything below it (the series and its games); this gives it
// everything above it (which phase and which round it belongs to) and the ledger that says what
// the match meant.
//
//  - `tournament_phases` is one competition format inside one event: the Swiss phase, then the Top
//    Cut. `planned_rounds` is frozen once, when check-in closes, from the confirmed field — a later
//    drop or disqualification never resizes it. `phase_order` is what puts two phases of one event
//    in sequence, and is UNIQUE per tournament so two phases can never claim the same slot.
//  - `tournament_rounds` is one published pairing of a phase. `published_at` and `closed_at` are
//    the round's own timestamps; the pairing audit columns are the pairer's own report about the
//    assignment it produced, persisted so a disputed pairing can be explained months later without
//    re-running a searcher whose budget constants may have changed in the meantime.
//  - `tournament_result_ledger` is the ONLY thing standings are computed from. Not counters: a
//    counter can be incremented twice or drift from the matches that justify it, and no read can
//    tell. One row per participant per round makes double-counting impossible by construction — the
//    UNIQUE index below is the idempotency key that lets the round-close sweep run as many times as
//    a scheduler cares to call it. `opponent_id` is null exactly for a bye.
//
// `tournament_matches` gets `phase_id`/`round_id`/`pairing_reason` as plain nullable columns with
// no foreign key. Nullable because the legacy single-elimination bracket writes matches that belong
// to no phase at all and must keep doing so; without the FK because the value is written in the
// same transaction that inserts the round, so referential integrity is upheld by the writer, and a
// declared FK would only make the additive ALTER riskier on installations mid-upgrade.
//
// pg-mem caveats, same as migrations 002, 004 and 005: one statement per query, no
// `gen_random_uuid()`, and every CHECK over a NULLABLE column is written `col IS NULL OR ...`
// because pg-mem reads a CHECK that evaluates to NULL as a violation where Postgres reads it as
// satisfied.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tournament_phases (
     id uuid PRIMARY KEY,
     tournament_id uuid NOT NULL REFERENCES tournaments(id),
     kind text NOT NULL CHECK (kind IN ('swiss','top_cut','single_elimination')),
     phase_order integer NOT NULL,
     status text NOT NULL CHECK (status IN ('scheduled','running','frozen','finished')),
     planned_rounds integer,
     created_at bigint NOT NULL,
     UNIQUE (tournament_id, phase_order)
   )`,
  `CREATE TABLE IF NOT EXISTS tournament_rounds (
     id uuid PRIMARY KEY,
     phase_id uuid NOT NULL REFERENCES tournament_phases(id),
     number integer NOT NULL CHECK (number >= 1),
     status text NOT NULL CHECK (status IN ('scheduled','published','resolving','closed')),
     published_at bigint,
     closed_at bigint,
     score_difference integer,
     score_difference_optimal boolean,
     budget_exhausted boolean,
     UNIQUE (phase_id, number)
   )`,
  `CREATE TABLE IF NOT EXISTS tournament_result_ledger (
     id uuid PRIMARY KEY,
     tournament_id uuid NOT NULL REFERENCES tournaments(id),
     participant_id uuid NOT NULL REFERENCES tournament_participants(id),
     opponent_id uuid REFERENCES tournament_participants(id),
     opponent_kind text CHECK (opponent_kind IS NULL OR opponent_kind IN ('human','bot')),
     round_number integer NOT NULL,
     outcome text NOT NULL CHECK (outcome IN ('win','loss','draw','bye','double_loss','no_show_loss','concession')),
     recorded_at bigint NOT NULL
   )`,
  // The idempotency key. A participant plays at most one match per round, so this is both the
  // natural uniqueness rule and what makes re-running the round-close sweep a no-op.
  `CREATE UNIQUE INDEX IF NOT EXISTS tournament_result_ledger_round_unique
     ON tournament_result_ledger(tournament_id, participant_id, round_number)`,
  "CREATE INDEX IF NOT EXISTS tournament_result_ledger_tournament ON tournament_result_ledger(tournament_id, round_number)",
  "CREATE INDEX IF NOT EXISTS tournament_phases_tournament ON tournament_phases(tournament_id, phase_order)",
  "CREATE INDEX IF NOT EXISTS tournament_rounds_phase ON tournament_rounds(phase_id, number)",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS phase_id uuid",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS round_id uuid",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS pairing_reason text",
  "CREATE INDEX IF NOT EXISTS tournament_matches_round ON tournament_matches(round_id)",
];

export const phasesAndRounds: Migration = {
  id: "006-phases-and-rounds",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
