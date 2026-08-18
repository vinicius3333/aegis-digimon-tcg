import type { Migration } from "../migrator.js";

// The banlist a tournament runs under — the policy the organizer chose, plus the card list it
// resolved to — frozen at creation so a later official update never changes a created event. Plus
// `ruleset_preset`, the id whose versioned defaults produced the `rules_snapshot` migration 002
// added; the snapshot alone cannot say which preset a summary should name. Plus `allow_bots`, which
// only a custom ruleset may set and which the summary has to report.
//
// The columns are nullable and carry no DDL default, because there is no correct default for a new
// row — creation always writes them explicitly. The trailing backfill is what gives legacy rows a
// value, and it follows the shape migration 002 established for the same pg-mem reasons documented
// there: one statement per query, and COALESCE rather than `WHERE col IS NULL`, so a column that
// somehow pre-exists with real data keeps it instead of being reset.
//
// Legacy rows resolve to `{"mode":"none"}` / `[]`: the pre-program bracket never enforced a
// banlist, and claiming otherwise retroactively would make decks already played look illegal. Their
// preset is `aegis_lightning`, the single-elimination best-of-one custom ruleset that is exactly
// what those brackets already were.
const STATEMENTS = [
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS ruleset_preset text",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS allow_bots boolean NOT NULL DEFAULT false",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS banlist_policy jsonb",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS banlist_cards jsonb",
  `UPDATE tournaments SET
     ruleset_preset=COALESCE(ruleset_preset,'aegis_lightning'),
     allow_bots=COALESCE(allow_bots,false),
     banlist_policy=COALESCE(banlist_policy,'{"mode":"none"}'),
     banlist_cards=COALESCE(banlist_cards,'[]')`,
];

export const tournamentRulesAndBanlist: Migration = {
  id: "003-tournament-rules-and-banlist",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
