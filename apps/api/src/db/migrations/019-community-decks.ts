import type { Migration } from "../migrator.js";

/**
 * Public decks. A row is a frozen copy of one saved deck, taken when its owner publishes; it does
 * not follow later edits. `like_count` and `copy_count` are kept in step with their tables in the
 * same transaction, so listing by popularity never counts rows.
 */
export const communityDecks: Migration = {
  id: "019-community-decks",
  up: `
    CREATE TABLE IF NOT EXISTS public_decks (
      id uuid PRIMARY KEY,
      account_id uuid NOT NULL REFERENCES accounts(id),
      source_deck_id text NOT NULL,
      name text NOT NULL,
      colors jsonb NOT NULL,
      main_deck jsonb NOT NULL,
      egg_deck jsonb NOT NULL,
      main_deck_arts jsonb NOT NULL,
      egg_deck_arts jsonb NOT NULL,
      cover_card_id text,
      like_count integer NOT NULL DEFAULT 0,
      copy_count integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'public',
      published_at bigint NOT NULL,
      updated_at bigint NOT NULL,
      UNIQUE (account_id, source_deck_id)
    );
    CREATE INDEX IF NOT EXISTS public_decks_top ON public_decks (status, like_count DESC, published_at DESC);
    CREATE INDEX IF NOT EXISTS public_decks_new ON public_decks (status, published_at DESC);
    CREATE TABLE IF NOT EXISTS public_deck_likes (
      public_deck_id uuid NOT NULL REFERENCES public_decks(id),
      account_id uuid NOT NULL REFERENCES accounts(id),
      created_at bigint NOT NULL,
      PRIMARY KEY (public_deck_id, account_id)
    );
    CREATE INDEX IF NOT EXISTS public_deck_likes_recent ON public_deck_likes (created_at, public_deck_id);
    CREATE TABLE IF NOT EXISTS public_deck_copies (
      public_deck_id uuid NOT NULL REFERENCES public_decks(id),
      account_id uuid NOT NULL REFERENCES accounts(id),
      created_at bigint NOT NULL,
      PRIMARY KEY (public_deck_id, account_id)
    );
  `,
};
