import type { Migration } from "../migrator.js";

// Durable primitives for moving a logical game between physical Colyseus rooms/processes.
// Session and transport identifiers are text on purpose: existing room IDs and deployment
// generation names remain valid identities, while callers may also use UUIDs for new sessions.
// Payload columns contain private game data and must never be copied into logs or public APIs.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS room_sessions (
     id text PRIMARY KEY,
     mode text NOT NULL CHECK (mode <> ''),
     status text NOT NULL CHECK (status IN ('active','completed','expired')),
     participants jsonb NOT NULL,
     tournament_match_id text,
     tournament_game_id text,
     owner_generation_id text NOT NULL,
     owner_process_id text NOT NULL,
     owner_room_id text NOT NULL,
     owner_epoch bigint NOT NULL DEFAULT 1 CHECK (owner_epoch >= 1),
     checkpoint_version bigint NOT NULL DEFAULT 0 CHECK (checkpoint_version >= 0),
     next_command_sequence bigint NOT NULL DEFAULT 1 CHECK (next_command_sequence >= 1),
     last_completed_command_sequence bigint NOT NULL DEFAULT 0 CHECK (last_completed_command_sequence >= 0),
     active_transfer_id text,
     created_at bigint NOT NULL,
     updated_at bigint NOT NULL,
     completed_at bigint,
     retention_until bigint
   )`,
  `CREATE TABLE IF NOT EXISTS room_checkpoints (
     session_id text PRIMARY KEY REFERENCES room_sessions(id) ON DELETE CASCADE,
     checkpoint_id text NOT NULL UNIQUE,
     checkpoint_version bigint NOT NULL CHECK (checkpoint_version >= 1),
     snapshot_schema_version integer NOT NULL CHECK (snapshot_schema_version >= 1),
     execution_version text NOT NULL,
     rules_version text NOT NULL,
     source_revision text NOT NULL,
     command_sequence bigint NOT NULL CHECK (command_sequence >= 0),
     checksum text NOT NULL,
     snapshot jsonb NOT NULL,
     created_at bigint NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS room_commands (
     session_id text NOT NULL REFERENCES room_sessions(id) ON DELETE CASCADE,
     command_id text NOT NULL,
     participant_id text NOT NULL,
     seat smallint NOT NULL CHECK (seat IN (0,1)),
     participant_sequence bigint NOT NULL CHECK (participant_sequence >= 1),
     command_sequence bigint NOT NULL CHECK (command_sequence >= 1),
     owner_epoch bigint NOT NULL CHECK (owner_epoch >= 1),
     expected_revision bigint,
     payload jsonb NOT NULL,
     status text NOT NULL CHECK (status IN ('admitted','applied','rejected')),
     result jsonb,
     admitted_at bigint NOT NULL,
     completed_at bigint,
     PRIMARY KEY (session_id, command_id),
     UNIQUE (session_id, participant_id, participant_sequence),
     UNIQUE (session_id, command_sequence),
     CHECK (status = 'admitted' OR completed_at IS NOT NULL)
   )`,
  `CREATE TABLE IF NOT EXISTS room_participant_sequences (
     session_id text NOT NULL REFERENCES room_sessions(id) ON DELETE CASCADE,
     participant_id text NOT NULL,
     last_sequence bigint NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
     updated_at bigint NOT NULL,
     PRIMARY KEY (session_id, participant_id)
   )`,
  `CREATE TABLE IF NOT EXISTS room_transfers (
     id text PRIMARY KEY,
     session_id text NOT NULL REFERENCES room_sessions(id) ON DELETE CASCADE,
     from_generation_id text NOT NULL,
     from_process_id text NOT NULL,
     from_room_id text NOT NULL,
     to_generation_id text NOT NULL,
     to_process_id text NOT NULL,
     to_room_id text NOT NULL,
     from_owner_epoch bigint NOT NULL CHECK (from_owner_epoch >= 1),
     to_owner_epoch bigint NOT NULL CHECK (to_owner_epoch = from_owner_epoch + 1),
     status text NOT NULL CHECK (status IN ('preparing','frozen','snapshot_saved','destination_validated','owner_switched','destination_active','completed','aborted')),
     checkpoint_id text,
     failure_code text,
     started_at bigint NOT NULL,
     updated_at bigint NOT NULL,
     committed_at bigint,
     completed_at bigint
   )`,
  `CREATE TABLE IF NOT EXISTS room_outbox (
     id text PRIMARY KEY,
     effect_key text NOT NULL UNIQUE,
     session_id text,
     owner_epoch bigint,
     effect_type text NOT NULL,
     payload jsonb NOT NULL,
     status text NOT NULL CHECK (status IN ('pending','claimed','delivered')),
     attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
     available_at bigint NOT NULL,
     claimed_by text,
     claim_expires_at bigint,
     created_at bigint NOT NULL,
     delivered_at bigint,
     last_error_code text,
     CHECK ((status = 'claimed') = (claimed_by IS NOT NULL AND claim_expires_at IS NOT NULL)),
     CHECK (status <> 'delivered' OR delivered_at IS NOT NULL)
   )`,
  "CREATE INDEX IF NOT EXISTS room_sessions_retention ON room_sessions(status, retention_until)",
  "CREATE INDEX IF NOT EXISTS room_sessions_tournament_match ON room_sessions(tournament_match_id) WHERE tournament_match_id IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS room_sessions_tournament_game ON room_sessions(tournament_game_id) WHERE tournament_game_id IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS room_commands_recovery ON room_commands(session_id, command_sequence) WHERE status = 'admitted'",
  "CREATE INDEX IF NOT EXISTS room_participant_sequences_session ON room_participant_sequences(session_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS room_transfers_one_active_per_session ON room_transfers(session_id) WHERE status NOT IN ('completed','aborted')",
  "CREATE INDEX IF NOT EXISTS room_transfers_recovery ON room_transfers(status, updated_at)",
  "CREATE INDEX IF NOT EXISTS room_outbox_due ON room_outbox(status, available_at, created_at)",
  "CREATE INDEX IF NOT EXISTS room_outbox_session ON room_outbox(session_id, created_at)",
];

export const roomHandoffPersistence: Migration = {
  id: "016-room-handoff-persistence",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
