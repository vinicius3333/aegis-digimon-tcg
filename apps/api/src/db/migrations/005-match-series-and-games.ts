import type { Migration } from "../migrator.js";

// The two layers the BO3 confrontation needs below `tournament_matches`, which until now owned a
// single `room_id` and therefore could only ever mean one game.
//
//  - `match_series` is the confrontation: the score, how many game wins settle it, and the ONE
//    clock that spans every game of it. The deadline lives here, not on the game and not on the
//    room, which is exactly what makes "game 2 gets a fresh room but not a fresh clock" true by
//    construction rather than by remembering to copy a value forward.
//  - `tournament_games` is one authoritative game inside that series, bound to at most one room.
//    `room_id` is UNIQUE so a room can never be counted as two games, and nullable because a game
//    exists (allocated, authorized) before any room has been created for it. `game_index` is the
//    sequence number of games actually PLAYED, not a slot out of three: a best-of-three is settled
//    by at most three decisive games, but a drawn or voided game decides nothing and is replayed,
//    so an index above 3 is the ordinary record of a series that drew one. The budget of decisive
//    games is enforced in the series module, which is the only place that knows `wins_required`.
//
// Presence is two nullable columns on `tournament_matches` rather than a presence table: a match
// has exactly two seats — no cardinality to grow into — and presence is read and written inside the
// same transaction that already holds `FOR UPDATE` on the match row to decide whether the series
// starts. A side table would add a second lock and a join for one timestamp per seat. The columns
// are named after the `player0_/player1_account_id` pair they belong to, so which seat a timestamp
// refers to is answered by the row itself.
//
// pg-mem caveats, same as migrations 002 and 004: statements run one per query because pg-mem plans
// a multi-statement batch against the pre-batch schema, and no statement relies on
// `gen_random_uuid()` or on a correlated subquery. One more applies here: every CHECK over a
// NULLABLE column is written `col IS NULL OR col IN (...)`. Postgres treats a CHECK that evaluates
// to NULL as satisfied, so the `IS NULL` arm is redundant there, but pg-mem reads the same NULL as
// a violation and would reject every row that has not got a result yet.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS match_series (
     id uuid PRIMARY KEY,
     tournament_match_id uuid NOT NULL UNIQUE REFERENCES tournament_matches(id),
     wins_required integer NOT NULL,
     wins0 integer NOT NULL DEFAULT 0,
     wins1 integer NOT NULL DEFAULT 0,
     status text NOT NULL CHECK (status IN ('playing','overtime','resolved','needs_organizer_decision')),
     started_at bigint NOT NULL,
     series_deadline_at bigint,
     overtime_started_at bigint,
     overtime_turns_remaining integer,
     official_result text CHECK (official_result IS NULL OR official_result IN ('participant0','participant1','draw','double_loss','voided')),
     resolution_reason text,
     resolved_at bigint,
     version integer NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS tournament_games (
     id uuid PRIMARY KEY,
     series_id uuid NOT NULL REFERENCES match_series(id),
     game_index integer NOT NULL CHECK (game_index >= 1),
     room_id text UNIQUE,
     status text NOT NULL CHECK (status IN ('allocated','room_claimed','playing','finished','voided')),
     result text CHECK (result IS NULL OR result IN ('participant0','participant1','draw','voided')),
     result_reason text,
     allocated_at bigint NOT NULL,
     claimed_at bigint,
     finished_at bigint,
     UNIQUE (series_id, game_index)
   )`,
  // Authorization to enter the room for one game, issued per participant and hashed exactly like
  // `room_tickets`: the plaintext token is returned once and never stored, so a database read
  // cannot reconstruct it. Per participant rather than per game because both players have to enter
  // the SAME room, and one shared single-use token would let whoever redeemed it first lock the
  // other out. The "one live authorization per series" rule is upheld a level up: authorizations
  // are only ever issued for the series' next unfinished game, so two games of one series can
  // never be enterable at the same time.
  `CREATE TABLE IF NOT EXISTS tournament_game_authorizations (
     token_hash text PRIMARY KEY,
     game_id uuid NOT NULL REFERENCES tournament_games(id),
     account_id uuid REFERENCES accounts(id),
     issued_at bigint NOT NULL,
     expires_at bigint NOT NULL,
     consumed_at bigint,
     consumed_room_id text
   )`,
  "CREATE INDEX IF NOT EXISTS tournament_games_series ON tournament_games(series_id, game_index)",
  "CREATE INDEX IF NOT EXISTS tournament_game_authorizations_game ON tournament_game_authorizations(game_id, account_id)",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS join_deadline_at bigint",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS player0_present_at bigint",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS player1_present_at bigint",
];

export const matchSeriesAndGames: Migration = {
  id: "005-match-series-and-games",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
