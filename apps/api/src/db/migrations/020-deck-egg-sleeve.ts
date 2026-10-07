import type { Migration } from "../migrator.js";

export const deckEggSleeve: Migration = {
  id: "020-deck-egg-sleeve",
  up: "ALTER TABLE saved_decks ADD COLUMN IF NOT EXISTS egg_sleeve_id text",
};
