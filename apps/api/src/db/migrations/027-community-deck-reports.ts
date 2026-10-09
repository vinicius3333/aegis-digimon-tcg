import type { Migration } from "../migrator.js";

/**
 * Player reports against public decks. A report stays open until a moderator hides the deck or
 * dismisses its reports; a reporter has at most one open report per deck, which a new report
 * replaces.
 */
export const communityDeckReports: Migration = {
  id: "027-community-deck-reports",
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS community_deck_reports (
        id serial PRIMARY KEY,
        public_deck_id uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
        reporter_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
        reason text NOT NULL,
        details text,
        created_at bigint NOT NULL,
        dismissed_at bigint
      )
    `);
    await db.query(
      "CREATE INDEX IF NOT EXISTS community_deck_reports_deck_idx ON community_deck_reports (public_deck_id, dismissed_at)",
    );
  },
};
