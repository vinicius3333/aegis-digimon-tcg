import type { Migration } from "../migrator.js";

export const deckCardArts: Migration = {
  id: "015-deck-card-arts",
  up: async (db) => {
    await db.query(
      "ALTER TABLE saved_decks ADD COLUMN IF NOT EXISTS main_deck_arts jsonb NOT NULL DEFAULT '[]'::jsonb",
    );
    await db.query("ALTER TABLE saved_decks ADD COLUMN IF NOT EXISTS egg_deck_arts jsonb NOT NULL DEFAULT '[]'::jsonb");
  },
};
