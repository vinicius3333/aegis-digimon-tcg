import type { Migration } from "#api/db/migrator";
export const privateSealedResults: Migration = {
  id: "060-private-sealed-results",
  up: `CREATE TABLE private_sealed_results (
    game_id uuid PRIMARY KEY,
    series_id uuid REFERENCES private_sealed_series(id) ON DELETE SET NULL,
    room_id text NOT NULL,
    winner smallint CHECK (winner IN (0,1)),
    finished_at bigint NOT NULL
  );
  CREATE INDEX private_sealed_results_series_id_idx ON private_sealed_results(series_id);`,
};
