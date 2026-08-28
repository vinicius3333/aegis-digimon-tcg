import type { Migration } from "../migrator.js";

// The deck each seat actually played, recorded on the GAME rather than looked up from the
// participant.
//
// `tournament_participants.deck_snapshot` is the deck a participant froze at check-in, and it is
// the right source when a room seats them. But it is a LIVE row: a re-registration, a judge's deck
// correction, or a later phase overwriting it retroactively rewrites what every already-played game
// appears to have been played with. The tournament record then contradicts itself — a game finished
// last Tuesday would answer "which deck won this?" with a list that did not exist on Tuesday.
//
// So the deck is copied onto the game at the moment the room claims the seat, and nothing rewrites
// it afterwards. Nullable because every game that predates this migration has no such evidence, and
// inventing one from today's participant row would be exactly the retroactive rewrite this column
// exists to prevent.
const STATEMENTS = [
  "ALTER TABLE tournament_games ADD COLUMN IF NOT EXISTS player0_deck_snapshot jsonb",
  "ALTER TABLE tournament_games ADD COLUMN IF NOT EXISTS player1_deck_snapshot jsonb",
];

export const gameDeckSnapshots: Migration = {
  id: "011-game-deck-snapshots",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
