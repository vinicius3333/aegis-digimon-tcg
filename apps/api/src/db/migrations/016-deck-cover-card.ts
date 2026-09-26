import type { Migration } from "../migrator.js";

export const deckCoverCard: Migration = {
  id: "016-deck-cover-card",
  up: "ALTER TABLE saved_decks ADD COLUMN IF NOT EXISTS cover_card_id text",
};
