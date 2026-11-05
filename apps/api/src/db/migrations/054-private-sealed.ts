import type { Migration } from "#api/db/migrator";
export const privateSealed: Migration = {
  id: "054-private-sealed",
  up: `CREATE TABLE private_sealed_series (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    host_hash text NOT NULL,
    request_id uuid NOT NULL,
    state jsonb NOT NULL,
    current_game_id uuid UNIQUE,
    UNIQUE(host_hash, request_id)
  );
  CREATE TABLE private_sealed_room_grants (
    token_hash text PRIMARY KEY,
    code text NOT NULL,
    game_id uuid NOT NULL,
    expires_at bigint NOT NULL
  );`,
};
