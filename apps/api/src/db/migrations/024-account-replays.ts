import type { Migration } from "../migrator.js";

export const accountReplays: Migration = {
  id: "024-account-replays",
  up: `
    CREATE TABLE account_replays (
      id uuid PRIMARY KEY,
      account_id uuid NOT NULL REFERENCES accounts(id),
      slot integer NOT NULL CHECK (slot BETWEEN 1 AND 10),
      match_id text NOT NULL,
      viewer_seat integer NOT NULL CHECK (viewer_seat IN (0,1)),
      summary jsonb NOT NULL,
      byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 2097152),
      checksum text NOT NULL,
      saved_at bigint NOT NULL,
      status text NOT NULL CHECK (status IN ('pending','ready','deleting')),
      UNIQUE (account_id, slot),
      UNIQUE (account_id, match_id, viewer_seat)
    );
    CREATE INDEX account_replays_cleanup ON account_replays(status, saved_at);
    CREATE TABLE replay_storage_usage (
      id integer PRIMARY KEY CHECK (id = 1),
      bytes bigint NOT NULL CHECK (bytes >= 0 AND bytes <= 20000000000)
    );
    INSERT INTO replay_storage_usage (id, bytes) VALUES (1, 0);
  `,
};
