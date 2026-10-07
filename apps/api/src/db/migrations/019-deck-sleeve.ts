import type { Migration } from "../migrator.js";

export const deckSleeve: Migration = {
  id: "019-deck-sleeve",
  up: "ALTER TABLE saved_decks ADD COLUMN IF NOT EXISTS sleeve_id text",
};
