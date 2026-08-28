import type { Migration } from "../migrator.js";

// What a bot participant needs in order to play, and what keeps its results distinguishable
// afterwards.
//
// Three separate problems, all rooted in the same fact: a bot has no Account.
//
//  1. **Which bot it is.** `bot_profile` names the personality (`apps/api/src/bot/profiles.ts`)
//     and `bot_deck_version` the exact shipped meta deck (`apps/api/src/bot/metaDecks/`). The
//     cards themselves still go into `deck_snapshot` like a human's, so room seating reads one
//     column for every participant; these two are the provenance of that snapshot, so a recorded
//     bot result stays traceable to the 55 cards and the weights that produced it.
//
//  2. **Which seat it occupies.** `tournament_matches` seats are `*_account_id` columns with a
//     foreign key to `accounts`, so a bot cannot be seated in one at all. The participant-id
//     columns added here are the seat identity the program bracket uses; the account columns stay
//     populated for human seats, because the legacy bracket, `room_tickets` and the existing
//     `SeriesStore` presence path all still read them. A human seat therefore has BOTH filled and
//     a bot seat only the participant one — never a seat with neither.
//     `tournament_game_authorizations.participant_id` is the same split one level down: an
//     authorization names an account for a human and a participant for a bot, and exactly one of
//     the two is ever set.
//
//  3. **That it was a bot.** `match_records.opponent_kind` flags a recorded game as played
//     against a bot, and `player1_account_id` becomes nullable to hold the bot's empty seat. The
//     recording convention is fixed and relied on by readers: in a bot match the HUMAN is always
//     `player0_account_id` and `player1_account_id` is NULL. `opponent_kind='human'` is the
//     default, so every row that already exists — and every ordinary ranked or legacy tournament
//     row written from now on — reads back exactly as it did before.
//
// `tournaments.bracket_seed` persists the deterministic seed the single-elimination bracket is
// drawn from, so a re-read of the bracket, or a rebuild after a restart, reproduces the same
// pairings rather than redrawing them.
//
// pg-mem caveats as in migrations 002/004/005: one statement per query, no `gen_random_uuid()`,
// and any CHECK over a nullable column spells out its `IS NULL` arm. `opponent_kind` is NOT NULL
// with a default so its CHECK needs no such arm.
const STATEMENTS = [
  "ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS bot_profile text",
  "ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS bot_deck_version text",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_seed text",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS player0_participant_id uuid REFERENCES tournament_participants(id)",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS player1_participant_id uuid REFERENCES tournament_participants(id)",
  "ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS winner_participant_id uuid REFERENCES tournament_participants(id)",
  "ALTER TABLE tournament_game_authorizations ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES tournament_participants(id)",
  "ALTER TABLE match_records ALTER COLUMN player1_account_id DROP NOT NULL",
  "ALTER TABLE match_records ADD COLUMN IF NOT EXISTS opponent_kind text NOT NULL DEFAULT 'human' CHECK (opponent_kind IN ('human','bot'))",
  // Who won, said in terms of SEATS rather than of an account.
  //
  // `winner_account_id IS NULL` used to mean "drawn", which is only true while both seats have an
  // account. A person who LOSES to a bot leaves that column null — the winner has no account — and
  // every reader of it then reports the loss as a draw. This column is the unambiguous statement,
  // and every existing row backfills to exactly what it already meant.
  "ALTER TABLE match_records ADD COLUMN IF NOT EXISTS outcome text CHECK (outcome IS NULL OR outcome IN ('player0','player1','draw'))",
  // The name to show for a seat that has no account to read one from.
  "ALTER TABLE match_records ADD COLUMN IF NOT EXISTS opponent_display_name text",
  // Same COALESCE shape as migrations 002/003: on Postgres the ADD COLUMN default has already
  // filled the column and this rewrites the identical value; where the column somehow pre-exists
  // with real data, that data is preserved instead of being reset.
  "UPDATE match_records SET opponent_kind=COALESCE(opponent_kind,'human')",
  `UPDATE match_records SET outcome=COALESCE(outcome,
     CASE WHEN winner_account_id IS NULL THEN 'draw'
          WHEN winner_account_id = player0_account_id THEN 'player0'
          ELSE 'player1' END)`,
];

// Widening `tournaments.status` so an event can actually be cancelled.
//
// Migration 001 pinned the column to the three pre-program statuses, which means the cancel path —
// a field that never reached the minimum — has nowhere to record itself and would either lie about
// the tournament's state or fail at runtime. The widened list is a SUPERSET: every value that was
// legal stays legal, so no existing row can be invalidated by this.
//
// Dropping a CHECK requires its name, and the name differs by engine: Postgres derives
// `tournaments_status_check`, pg-mem numbers its own (`tournaments_constraint_1`). The catalog is
// asked first — the authoritative answer wherever it exists — and the two known names are dropped
// as a fallback for engines that expose no catalog. Every drop is `IF EXISTS`, so the ones that do
// not apply are no-ops.
const WIDENED_STATUS =
  "ALTER TABLE tournaments ADD CONSTRAINT tournaments_status_check CHECK (status IN ('draft','registration','check_in','in_progress','running','finished','cancelled'))";

async function widenStatusCheck(db: Parameters<Extract<Migration["up"], (db: never) => unknown>>[0]): Promise<void> {
  const named = await constraintNames(db);
  for (const name of named.length > 0 ? named : ["tournaments_status_check", "tournaments_constraint_1"])
    await db.query(`ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS ${name}`);
  await db.query(WIDENED_STATUS);
}

/** Every CHECK constraint on `tournaments`; empty where the engine publishes no catalog. */
async function constraintNames(db: Parameters<Extract<Migration["up"], (db: never) => unknown>>[0]): Promise<string[]> {
  try {
    const rows = await db.query<{ conname: string }>(
      "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE c.contype='c' AND t.relname='tournaments'",
    );
    return rows.rows.map((row) => row.conname);
  } catch {
    return [];
  }
}

export const botParticipants: Migration = {
  id: "008-bot-participants",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
    await widenStatusCheck(db);
  },
};
