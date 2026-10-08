import type { Migration } from "../migrator.js";

export const replaySharingHistory: Migration = {
  id: "025-replay-sharing-history",
  up: `
    ALTER TABLE account_replays ADD COLUMN visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public'));
    CREATE TABLE account_recent_matches (
      account_id uuid NOT NULL REFERENCES accounts(id),
      room_id text NOT NULL,
      match_id text NOT NULL,
      finished_at bigint NOT NULL,
      record jsonb NOT NULL,
      PRIMARY KEY (account_id, room_id)
    );
    CREATE INDEX account_recent_matches_order ON account_recent_matches(account_id, finished_at DESC);
  `,
};
