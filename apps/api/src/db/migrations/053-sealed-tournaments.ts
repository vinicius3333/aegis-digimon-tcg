import type { Migration } from "#api/db/migrator";

export const sealedTournaments: Migration = {
  id: "053-sealed-tournaments",
  up: `ALTER TABLE tournaments ADD COLUMN sealed_configuration jsonb;
    ALTER TABLE tournaments ADD COLUMN sealed_build_deadline_at bigint;
    CREATE TABLE tournament_sealed_pools (
      participant_id uuid PRIMARY KEY REFERENCES tournament_participants(id),
      packs jsonb NOT NULL,
      allocated_at bigint NOT NULL,
      revision integer NOT NULL DEFAULT 0,
      ready_window text,
      UNIQUE (participant_id, allocated_at)
    );
    CREATE TABLE tournament_sealed_decks (
      participant_id uuid NOT NULL REFERENCES tournament_sealed_pools(participant_id),
      revision integer NOT NULL CHECK (revision > 0),
      window_key text NOT NULL,
      submission jsonb NOT NULL,
      snapshot jsonb NOT NULL,
      submitted_at bigint NOT NULL,
      PRIMARY KEY (participant_id, revision)
    );`,
};
