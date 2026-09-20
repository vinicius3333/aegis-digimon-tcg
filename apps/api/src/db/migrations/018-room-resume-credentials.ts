import type { Migration } from "../migrator.js";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS room_resume_credentials (
     session_id text NOT NULL REFERENCES room_sessions(id) ON DELETE CASCADE,
     participant_id text NOT NULL,
     credential_hash varchar(64) NOT NULL UNIQUE,
     expires_at bigint NOT NULL,
     created_at bigint NOT NULL,
     PRIMARY KEY (session_id, participant_id)
   )`,
  "CREATE INDEX IF NOT EXISTS room_resume_credentials_expiry ON room_resume_credentials(expires_at)",
  `CREATE TABLE IF NOT EXISTS room_handoff_reservations (
     transfer_id text PRIMARY KEY,
     session_id text NOT NULL,
     source_owner_epoch bigint NOT NULL CHECK (source_owner_epoch >= 1),
     destination_generation_id text NOT NULL,
     owner_epoch bigint NOT NULL CHECK (owner_epoch = source_owner_epoch + 1),
     token_hash text NOT NULL UNIQUE,
     expires_at bigint NOT NULL,
     created_at bigint NOT NULL,
     consumed_at bigint,
     room_id text,
     process_id text,
     CHECK ((consumed_at IS NULL) = (room_id IS NULL AND process_id IS NULL))
   )`,
  "CREATE INDEX IF NOT EXISTS room_handoff_reservations_expiry ON room_handoff_reservations(expires_at) WHERE consumed_at IS NULL",
];

export const roomResumeCredentials: Migration = {
  id: "018-room-resume-credentials",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
