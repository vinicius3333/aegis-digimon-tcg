import type { Migration } from "#api/db/migrator";
export const privateSealedResults: Migration = {
  id: "055-private-sealed-results",
  up: `CREATE TABLE private_sealed_results (
    game_id uuid PRIMARY KEY,
    series_id uuid NOT NULL REFERENCES private_sealed_series(id),
    room_id text NOT NULL,
    winner smallint CHECK (winner IN (0,1)),
    finished_at bigint NOT NULL
  );`,
};
