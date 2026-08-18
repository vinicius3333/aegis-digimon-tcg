import type { Migration } from "../migrator.js";

// Additive columns for the tournament program. Every column is nullable or defaulted, so legacy
// rows read back as what they always were: single-elimination, best-of-one, no Top Cut.
//
// Two shapes here are driven by pg-mem, the in-memory Postgres the AccountStore tests run on,
// rather than by Postgres itself:
//  - statements run one per query, because pg-mem plans a multi-statement batch against the
//    schema as it stood before the batch, so an UPDATE cannot see columns added earlier in it;
//  - the trailing backfill touches every row but writes through COALESCE, rather than being
//    guarded by `WHERE col IS NULL`. The guard is the natural shape, but pg-mem does not surface
//    the ADD COLUMN default on rows a transaction already had in view and then reports no row as
//    NULL anyway, so a guarded UPDATE matches nothing and the legacy rows commit as NULL. COALESCE
//    buys the same protection from the other side: on Postgres the ADD COLUMN default has already
//    filled the column and this rewrites the identical value, and where the columns somehow
//    pre-exist with real data — a manual hotfix or restored schema skew, in which case
//    ADD COLUMN IF NOT EXISTS no-ops — that data is preserved instead of being reset to defaults.
//    `top_cut_size` is left out entirely for the same reason: it has no default to restore, so
//    writing it could only destroy a pre-existing value.
const STATEMENTS = [
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS structure text NOT NULL DEFAULT 'single_elimination'",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS best_of integer NOT NULL DEFAULT 1",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS top_cut_enabled boolean NOT NULL DEFAULT false",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS top_cut_size integer",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS ruleset_version text",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rules_snapshot jsonb",
  `UPDATE tournaments SET
     structure=COALESCE(structure,'single_elimination'),
     best_of=COALESCE(best_of,1),
     top_cut_enabled=COALESCE(top_cut_enabled,false)`,
];

export const tournamentProgramColumns: Migration = {
  id: "002-tournament-program-columns",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
