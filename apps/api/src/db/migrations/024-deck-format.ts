import type { Migration } from "../migrator.js";

export const savedDeckFormat: Migration = {
  id: "024-deck-format",
  up: "ALTER TABLE saved_decks ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'standard'",
};
