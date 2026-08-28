import type { Migration } from "../migrator.js";

// The evidence a Top Cut is drawn from, and the seed it is drawn onto.
//
// `tournament_standings_snapshots` is the FROZEN final standings of a phase: one row per
// participant, written once, in the same transaction that creates the cut phase. It exists because
// standings are otherwise a projection of a table that keeps changing — the Top Cut phase writes
// its own ledger rows, so re-projecting after the cut would no longer produce the order the cut was
// made from. A dispute months later has to be answerable from stored rows, not from a projection
// that has moved on, so the numbers the decision used are persisted verbatim.
//
// `eligible` and `cut_seed` are part of that evidence rather than derived from it. `eligible`
// records whether the participant was still in the event at the freeze; `cut_seed` is the bracket
// seed they received, or NULL for everybody below the cut line. Together they answer "why is the
// 9th-placed player in the Top 8?" — because somebody above them had dropped — without needing the
// participants table, whose `status` keeps moving afterwards.
//
// `tournament_participants.top_cut_seed` is the same number written where the bracket reads it —
// and `EliminationStore.publishSeededBracket` does read it, ordering the draw by this column rather
// than by a value passed alongside it, so the stored number is the one the bracket was built from.
// It is a SEPARATE column from `seed` on purpose: `seed` is the registration seed, and standings use
// it as the final tiebreak that makes their order total. Overwriting it with cut ranks would
// silently reorder the standings the cut was derived from, which is precisely the value this
// slice exists to keep still.
//
// pg-mem caveats as in migrations 002/004/005/006: one statement per query, no `gen_random_uuid()`,
// and any CHECK over a nullable column spells out its `IS NULL` arm.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tournament_standings_snapshots (
     id uuid PRIMARY KEY,
     tournament_id uuid NOT NULL REFERENCES tournaments(id),
     phase_id uuid NOT NULL REFERENCES tournament_phases(id),
     participant_id uuid NOT NULL REFERENCES tournament_participants(id),
     rank integer NOT NULL,
     points integer NOT NULL,
     match_win_rate double precision NOT NULL,
     opponent_match_win_rate double precision NOT NULL,
     wins integer NOT NULL,
     losses integer NOT NULL,
     draws integer NOT NULL,
     byes integer NOT NULL,
     eligible boolean NOT NULL,
     cut_seed integer,
     frozen_at bigint NOT NULL
   )`,
  // One row per participant per phase, which is both the natural rule and the idempotency key: the
  // freeze may be attempted by the round-close path and by the sweep at once, and the second
  // attempt must add nothing.
  `CREATE UNIQUE INDEX IF NOT EXISTS tournament_standings_snapshots_unique
     ON tournament_standings_snapshots(phase_id, participant_id)`,
  "CREATE INDEX IF NOT EXISTS tournament_standings_snapshots_tournament ON tournament_standings_snapshots(tournament_id, rank)",
  "ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS top_cut_seed integer",
  // Where this phase's rounds start in the tournament's own round numbering.
  //
  // Two shipped keys number rounds per TOURNAMENT, not per phase: `tournament_matches` is unique on
  // `(tournament_id, round, position)` and `tournament_result_ledger` on
  // `(tournament_id, participant_id, round_number)`. A second phase that restarted at round 1 would
  // therefore collide with the first on both — the match insert would be rejected outright, and,
  // far worse, a cut result would hit the ledger's `ON CONFLICT DO NOTHING` and be silently
  // discarded as a duplicate of that participant's round-1 Swiss result.
  //
  // So a phase's rounds continue the numbering instead of restarting it: a four-round Swiss is
  // followed by a Top 8 occupying rounds 5, 6 and 7. `planned_rounds` stays the phase's OWN round
  // count, so the bracket arithmetic is unchanged and only the database boundary shifts. Existing
  // phases default to 0 and are numbered exactly as they were.
  "ALTER TABLE tournament_phases ADD COLUMN IF NOT EXISTS round_offset integer NOT NULL DEFAULT 0",
];

export const topCut: Migration = {
  id: "009-top-cut",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
