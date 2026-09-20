import type { Pool, PoolClient } from "pg";
import { timingSafeEqual } from "node:crypto";
import { migrations } from "../migrations/index.js";
import { runMigrations } from "../migrator.js";

export type RoomOwner = { generationId: string; processId: string; roomId: string };
export type RoomParticipant = { seat: 0 | 1; kind: "account" | "bot"; principalId: string };

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type TransferStatus =
  | "preparing"
  | "frozen"
  | "snapshot_saved"
  | "destination_validated"
  | "owner_switched"
  | "destination_active"
  | "completed"
  | "aborted";
export type CommandStatus = "admitted" | "applied" | "rejected";

export type RoomSessionRecord = {
  sessionId: string;
  mode: string;
  status: "active" | "completed" | "expired";
  participants: RoomParticipant[];
  tournamentMatchId: string | null;
  tournamentGameId: string | null;
  owner: RoomOwner;
  ownerEpoch: number;
  checkpointVersion: number;
  nextCommandSequence: number;
  lastCompletedCommandSequence: number;
  activeTransferId: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  retentionUntil: number | null;
};

export type RoomCheckpointRecord = {
  sessionId: string;
  checkpointId: string;
  checkpointVersion: number;
  snapshotSchemaVersion: number;
  executionVersion: string;
  rulesVersion: string;
  sourceRevision: string;
  commandSequence: number;
  checksum: string;
  snapshot: JsonValue;
  createdAt: number;
};

export type RoomCommandRecord = {
  sessionId: string;
  commandId: string;
  participantId: string;
  seat: 0 | 1;
  participantSequence: number;
  commandSequence: number;
  ownerEpoch: number;
  expectedRevision: number | null;
  payload: JsonValue;
  status: CommandStatus;
  result: JsonValue | null;
  admittedAt: number;
  completedAt: number | null;
};

export type RoomTransferRecord = {
  transferId: string;
  sessionId: string;
  from: RoomOwner;
  to: RoomOwner;
  fromOwnerEpoch: number;
  toOwnerEpoch: number;
  status: TransferStatus;
  checkpointId: string | null;
  failureCode: string | null;
  startedAt: number;
  updatedAt: number;
  committedAt: number | null;
  completedAt: number | null;
};

export type RoomOutboxRecord = {
  id: string;
  effectKey: string;
  sessionId: string;
  ownerEpoch: number;
  effectType: string;
  payload: JsonValue;
  status: "pending" | "claimed" | "delivered";
  attemptCount: number;
  availableAt: number;
  claimedBy: string | null;
  claimExpiresAt: number | null;
  createdAt: number;
  deliveredAt: number | null;
  lastErrorCode: string | null;
};

export type RoomHandoffReservationRecord = {
  transferId: string;
  sessionId: string;
  sourceOwnerEpoch: number;
  destinationGenerationId: string;
  ownerEpoch: number;
  expiresAt: number;
  consumedAt: number;
  roomId: string;
  processId: string;
};

export type RoomHandoffPendingTaskCount = {
  commands: number;
  outbox: number;
  transfers: number;
  total: number;
};

export type HandoffFailure =
  | "session_not_found"
  | "session_not_active"
  | "owner_epoch_mismatch"
  | "session_id_conflict"
  | "invalid_participants"
  | "participant_not_seated"
  | "command_not_found"
  | "command_id_conflict"
  | "participant_sequence_conflict"
  | "participant_sequence_gap"
  | "command_sequence_gap"
  | "command_not_completed"
  | "checkpoint_regression"
  | "transfer_not_found"
  | "transfer_in_progress"
  | "transfer_state_mismatch"
  | "checkpoint_mismatch"
  | "effect_key_conflict"
  | "outbox_claim_lost";

export type HandoffResult<T> = { ok: true; value: T; replayed: boolean } | { ok: false; reason: HandoffFailure };

export type NewRoomCommand = {
  sessionId: string;
  commandId: string;
  participantId: string;
  seat: 0 | 1;
  participantSequence: number;
  ownerEpoch: number;
  expectedRevision?: number | null;
  payload: JsonValue;
  now: number;
};

export type NewOutboxEffect = {
  id: string;
  effectKey: string;
  sessionId: string;
  ownerEpoch: number;
  effectType: string;
  payload: JsonValue;
  now: number;
};

type SessionRow = {
  id: string;
  mode: string;
  status: RoomSessionRecord["status"];
  participants: RoomParticipant[];
  tournament_match_id: string | null;
  tournament_game_id: string | null;
  owner_generation_id: string;
  owner_process_id: string;
  owner_room_id: string;
  owner_epoch: string | number;
  checkpoint_version: string | number;
  next_command_sequence: string | number;
  last_completed_command_sequence: string | number;
  active_transfer_id: string | null;
  created_at: string | number;
  updated_at: string | number;
  completed_at: string | number | null;
  retention_until: string | number | null;
};

type CommandRow = {
  session_id: string;
  command_id: string;
  participant_id: string;
  seat: 0 | 1;
  participant_sequence: string | number;
  command_sequence: string | number;
  owner_epoch: string | number;
  expected_revision: string | number | null;
  payload: JsonValue;
  status: CommandStatus;
  result: JsonValue | null;
  admitted_at: string | number;
  completed_at: string | number | null;
};

type TransferRow = {
  id: string;
  session_id: string;
  from_generation_id: string;
  from_process_id: string;
  from_room_id: string;
  to_generation_id: string;
  to_process_id: string;
  to_room_id: string;
  from_owner_epoch: string | number;
  to_owner_epoch: string | number;
  status: TransferStatus;
  checkpoint_id: string | null;
  failure_code: string | null;
  started_at: string | number;
  updated_at: string | number;
  committed_at: string | number | null;
  completed_at: string | number | null;
};

type OutboxRow = {
  id: string;
  effect_key: string;
  session_id: string;
  owner_epoch: string | number;
  effect_type: string;
  payload: JsonValue;
  status: RoomOutboxRecord["status"];
  attempt_count: number;
  available_at: string | number;
  claimed_by: string | null;
  claim_expires_at: string | number | null;
  created_at: string | number;
  delivered_at: string | number | null;
  last_error_code: string | null;
};

const TRANSFER_TRANSITIONS: Readonly<Record<"preparing" | "frozen" | "snapshot_saved", TransferStatus>> = {
  preparing: "frozen",
  frozen: "snapshot_saved",
  snapshot_saved: "destination_validated",
};

/**
 * PostgreSQL-backed durable boundary for logical rooms. All writes that can change authority lock
 * the logical session row and compare `owner_epoch` in the same transaction. A local mutex is not
 * sufficient because blue and green run in different processes.
 */
export class RoomHandoffStore {
  private ready: Promise<void> | undefined;

  constructor(private readonly pool: Pool) {}

  async createSession(input: {
    sessionId: string;
    mode: string;
    participants: readonly RoomParticipant[];
    owner: RoomOwner;
    tournamentMatchId?: string | null;
    tournamentGameId?: string | null;
    now: number;
  }): Promise<HandoffResult<RoomSessionRecord>> {
    if (
      input.participants.length !== 2 ||
      new Set(input.participants.map(({ seat }) => seat)).size !== 2 ||
      new Set(input.participants.map(({ principalId }) => principalId)).size !== 2
    )
      return failure("invalid_participants");
    return this.transaction(async (client) => {
      const prior = await client.query<SessionRow>("SELECT * FROM room_sessions WHERE id=$1", [input.sessionId]);
      if (prior.rows[0]) {
        const row = prior.rows[0];
        if (!sameSessionInput(row, input)) return failure("session_id_conflict");
        return success(toSession(row), true);
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO room_sessions (
           id, mode, status, participants, tournament_match_id, tournament_game_id,
           owner_generation_id, owner_process_id, owner_room_id, created_at, updated_at
         ) VALUES ($1,$2,'active',$3::jsonb,$4,$5,$6,$7,$8,$9,$9)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [
          input.sessionId,
          input.mode,
          JSON.stringify(input.participants),
          input.tournamentMatchId ?? null,
          input.tournamentGameId ?? null,
          input.owner.generationId,
          input.owner.processId,
          input.owner.roomId,
          input.now,
        ],
      );
      const existing = await client.query<SessionRow>("SELECT * FROM room_sessions WHERE id=$1", [input.sessionId]);
      const row = existing.rows[0];
      if (!row) throw new Error("room session insert was not visible after write");
      if (!sameSessionInput(row, input)) return failure("session_id_conflict");
      if (inserted.rows.length > 0) {
        for (const participant of input.participants) {
          const cursor = await client.query(
            "SELECT 1 FROM room_participant_sequences WHERE session_id=$1 AND participant_id=$2",
            [input.sessionId, participant.principalId],
          );
          if (cursor.rowCount) continue;
          await client.query(
            "INSERT INTO room_participant_sequences (session_id, participant_id, last_sequence, updated_at) VALUES ($1,$2,0,$3)",
            [input.sessionId, participant.principalId, input.now],
          );
        }
      }
      return success(toSession(row), inserted.rows.length === 0);
    });
  }

  async getSession(sessionId: string): Promise<RoomSessionRecord | undefined> {
    await this.ensureReady();
    const result = await this.pool.query<SessionRow>("SELECT * FROM room_sessions WHERE id=$1", [sessionId]);
    return result.rows[0] ? toSession(result.rows[0]) : undefined;
  }

  /** Rotate a participant-scoped resume credential. Only its digest is persisted. */
  async rotateResumeCredential(input: {
    sessionId: string;
    participantId: string;
    credentialHash: string;
    now: number;
    expiresAt: number;
  }): Promise<boolean> {
    if (!isSha256Hex(input.credentialHash) || input.expiresAt <= input.now) return false;
    return this.transaction(async (client) => {
      const session = await lockSession(client, input.sessionId);
      if (!session || session.status !== "active") return false;
      const participant = session.participants.find(
        (candidate) => candidate.kind === "account" && candidate.principalId === input.participantId,
      );
      if (!participant) return false;
      await client.query(
        `INSERT INTO room_resume_credentials (session_id,participant_id,credential_hash,expires_at,created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (session_id,participant_id) DO UPDATE SET
           credential_hash=EXCLUDED.credential_hash, expires_at=EXCLUDED.expires_at, created_at=EXCLUDED.created_at`,
        [input.sessionId, input.participantId, input.credentialHash, input.expiresAt, input.now],
      );
      return true;
    });
  }

  /**
   * Verify against every unexpired account credential for this logical game. Comparisons happen
   * in constant time and do not stop at the first participant match.
   */
  async verifyResumeCredential(input: {
    sessionId: string;
    credentialHash: string;
    now: number;
  }): Promise<string | undefined> {
    if (!isSha256Hex(input.credentialHash)) return undefined;
    await this.ensureReady();
    const result = await this.pool.query<{ participant_id: string; credential_hash: string }>(
      `SELECT participant_id,credential_hash FROM room_resume_credentials
       WHERE session_id=$1 AND expires_at>$2 ORDER BY participant_id`,
      [input.sessionId, input.now],
    );
    const presented = Buffer.from(input.credentialHash, "hex");
    let matchedParticipant: string | undefined;
    for (const row of result.rows) {
      const expected = isSha256Hex(row.credential_hash) ? Buffer.from(row.credential_hash, "hex") : Buffer.alloc(0);
      const matches = expected.length === presented.length && timingSafeEqual(expected, presented);
      if (matches) matchedParticipant = row.participant_id;
    }
    return matchedParticipant;
  }

  /** Persist a one-time, short-lived destination room reservation before invoking matchmake. */
  async createRoomHandoffReservation(input: {
    transferId: string;
    sessionId: string;
    sourceOwnerEpoch: number;
    destinationGenerationId: string;
    ownerEpoch: number;
    tokenHash: string;
    now: number;
    expiresAt: number;
  }): Promise<boolean> {
    if (
      !isSha256Hex(input.tokenHash) ||
      input.ownerEpoch !== input.sourceOwnerEpoch + 1 ||
      input.expiresAt <= input.now
    )
      throw new Error("invalid_room_handoff_reservation");
    return this.transaction(async (client) => {
      await client.query("DELETE FROM room_handoff_reservations WHERE consumed_at IS NULL AND expires_at<=$1", [
        input.now,
      ]);
      const prior = await client.query<{
        session_id: string;
        source_owner_epoch: string | number;
        destination_generation_id: string;
        owner_epoch: string | number;
        consumed_at: string | number | null;
      }>("SELECT * FROM room_handoff_reservations WHERE transfer_id=$1 FOR UPDATE", [input.transferId]);
      const existing = prior.rows[0];
      if (existing) {
        if (
          existing.session_id !== input.sessionId ||
          number(existing.source_owner_epoch) !== input.sourceOwnerEpoch ||
          existing.destination_generation_id !== input.destinationGenerationId ||
          number(existing.owner_epoch) !== input.ownerEpoch ||
          existing.consumed_at !== null
        )
          return false;
        const updated = await client.query(
          `UPDATE room_handoff_reservations
           SET token_hash=$2,expires_at=$3,created_at=$4
           WHERE transfer_id=$1 AND consumed_at IS NULL`,
          [input.transferId, input.tokenHash, input.expiresAt, input.now],
        );
        return (updated.rowCount ?? 0) > 0;
      }
      const inserted = await client.query<{ transfer_id: string }>(
        `INSERT INTO room_handoff_reservations (
           transfer_id,session_id,source_owner_epoch,destination_generation_id,owner_epoch,token_hash,
           expires_at,created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (transfer_id) DO NOTHING RETURNING transfer_id`,
        [
          input.transferId,
          input.sessionId,
          input.sourceOwnerEpoch,
          input.destinationGenerationId,
          input.ownerEpoch,
          input.tokenHash,
          input.expiresAt,
          input.now,
        ],
      );
      return inserted.rows.length > 0;
    });
  }

  /** Atomically consume a reservation for exactly one target process/room creation. */
  async redeemRoomHandoffReservation(input: {
    tokenHash: string;
    destinationGenerationId: string;
    ownerEpoch: number;
    roomId: string;
    processId: string;
    now: number;
  }): Promise<RoomHandoffReservationRecord | undefined> {
    if (!isSha256Hex(input.tokenHash)) return undefined;
    await this.ensureReady();
    const result = await this.pool.query<{
      transfer_id: string;
      session_id: string;
      source_owner_epoch: string | number;
      destination_generation_id: string;
      owner_epoch: string | number;
      expires_at: string | number;
      consumed_at: string | number;
      room_id: string;
      process_id: string;
    }>(
      `UPDATE room_handoff_reservations
       SET consumed_at=$6,room_id=$4,process_id=$5
       WHERE token_hash=$1 AND destination_generation_id=$2 AND owner_epoch=$3
         AND expires_at>$6 AND consumed_at IS NULL
       RETURNING transfer_id,session_id,source_owner_epoch,destination_generation_id,owner_epoch,
                 expires_at,consumed_at,room_id,process_id`,
      [input.tokenHash, input.destinationGenerationId, input.ownerEpoch, input.roomId, input.processId, input.now],
    );
    const row = result.rows[0];
    return row
      ? {
          transferId: row.transfer_id,
          sessionId: row.session_id,
          sourceOwnerEpoch: number(row.source_owner_epoch),
          destinationGenerationId: row.destination_generation_id,
          ownerEpoch: number(row.owner_epoch),
          expiresAt: number(row.expires_at),
          consumedAt: number(row.consumed_at),
          roomId: row.room_id,
          processId: row.process_id,
        }
      : undefined;
  }

  async getRoomHandoffReservation(transferId: string): Promise<RoomHandoffReservationRecord | undefined> {
    await this.ensureReady();
    const result = await this.pool.query<{
      transfer_id: string;
      session_id: string;
      source_owner_epoch: string | number;
      destination_generation_id: string;
      owner_epoch: string | number;
      expires_at: string | number;
      consumed_at: string | number | null;
      room_id: string | null;
      process_id: string | null;
    }>(
      `SELECT transfer_id,session_id,source_owner_epoch,destination_generation_id,owner_epoch,
              expires_at,consumed_at,room_id,process_id
       FROM room_handoff_reservations WHERE transfer_id=$1`,
      [transferId],
    );
    const row = result.rows[0];
    if (!row || row.consumed_at === null || row.room_id === null || row.process_id === null) return undefined;
    return {
      transferId: row.transfer_id,
      sessionId: row.session_id,
      sourceOwnerEpoch: number(row.source_owner_epoch),
      destinationGenerationId: row.destination_generation_id,
      ownerEpoch: number(row.owner_epoch),
      expiresAt: number(row.expires_at),
      consumedAt: number(row.consumed_at),
      roomId: row.room_id,
      processId: row.process_id,
    };
  }

  /** Cleanup only the specific unconsumed token; an already-created target remains auditable. */
  async cancelRoomHandoffReservation(input: { transferId: string; tokenHash: string }): Promise<boolean> {
    if (!isSha256Hex(input.tokenHash)) return false;
    await this.ensureReady();
    const result = await this.pool.query(
      `DELETE FROM room_handoff_reservations
       WHERE transfer_id=$1 AND token_hash=$2 AND consumed_at IS NULL`,
      [input.transferId, input.tokenHash],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Drop a consumed, short-lived reservation after beginTransfer has persisted the target. */
  async removeConsumedRoomHandoffReservation(transferId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "DELETE FROM room_handoff_reservations WHERE transfer_id=$1 AND consumed_at IS NOT NULL",
      [transferId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listActiveSessionsByGeneration(generationId: string): Promise<RoomSessionRecord[]> {
    await this.ensureReady();
    const result = await this.pool.query<SessionRow>(
      "SELECT * FROM room_sessions WHERE owner_generation_id=$1 AND status='active' ORDER BY id",
      [generationId],
    );
    return result.rows.map(toSession);
  }

  async listInFlightTransfersByGeneration(generationId: string): Promise<RoomTransferRecord[]> {
    await this.ensureReady();
    const result = await this.pool.query<TransferRow>(
      `SELECT * FROM room_transfers
       WHERE (from_generation_id=$1 OR to_generation_id=$1) AND status NOT IN ('completed','aborted')
       ORDER BY started_at,id`,
      [generationId],
    );
    return result.rows.map(toTransfer);
  }

  async completeSession(input: {
    sessionId: string;
    ownerEpoch: number;
    now: number;
    retentionUntil: number;
  }): Promise<HandoffResult<RoomSessionRecord>> {
    return this.transaction(async (client) => {
      const session = await lockSession(client, input.sessionId);
      if (!session) return failure("session_not_found");
      if (session.status === "completed") return success(toSession(session), true);
      if (session.status !== "active") return failure("session_not_active");
      if (number(session.owner_epoch) !== input.ownerEpoch) return failure("owner_epoch_mismatch");
      if (session.active_transfer_id) return failure("transfer_in_progress");
      await client.query(
        `UPDATE room_sessions SET status='completed', completed_at=$2, retention_until=$3, updated_at=$2
         WHERE id=$1 AND owner_epoch=$4 AND status='active' AND active_transfer_id IS NULL`,
        [input.sessionId, input.now, input.retentionUntil, input.ownerEpoch],
      );
      const completed = await client.query<SessionRow>("SELECT * FROM room_sessions WHERE id=$1", [input.sessionId]);
      return success(toSession(completed.rows[0]!));
    });
  }

  async getCheckpoint(sessionId: string): Promise<RoomCheckpointRecord | undefined> {
    await this.ensureReady();
    const result = await this.pool.query<CheckpointRow>("SELECT * FROM room_checkpoints WHERE session_id=$1", [
      sessionId,
    ]);
    return result.rows[0] ? toCheckpoint(result.rows[0]) : undefined;
  }

  /** The oldest admitted command is the write-ahead recovery cursor for a restarted owner. */
  async getNextAdmittedCommand(sessionId: string): Promise<RoomCommandRecord | undefined> {
    await this.ensureReady();
    const result = await this.pool.query<CommandRow>(
      `SELECT * FROM room_commands
       WHERE session_id=$1 AND status='admitted'
       ORDER BY command_sequence
       LIMIT 1`,
      [sessionId],
    );
    return result.rows[0] ? toCommand(result.rows[0]) : undefined;
  }

  async getCommand(sessionId: string, commandId: string): Promise<RoomCommandRecord | undefined> {
    await this.ensureReady();
    const result = await this.pool.query<CommandRow>(
      "SELECT * FROM room_commands WHERE session_id=$1 AND command_id=$2",
      [sessionId, commandId],
    );
    return result.rows[0] ? toCommand(result.rows[0]) : undefined;
  }

  /** Authoritative outstanding work; cleanup must not infer this from process-local queues. */
  async countPendingTasks(sessionId?: string): Promise<RoomHandoffPendingTaskCount> {
    await this.ensureReady();
    const commandScope = sessionId === undefined ? "" : " AND session_id=$1";
    const outboxScope = sessionId === undefined ? "" : " AND session_id=$1";
    const transferScope = sessionId === undefined ? "" : " AND session_id=$1";
    const result = await this.pool.query<{
      commands: string | number;
      outbox: string | number;
      transfers: string | number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM room_commands WHERE status='admitted'${commandScope}) AS commands,
         (SELECT COUNT(*) FROM room_outbox WHERE status <> 'delivered'${outboxScope}) AS outbox,
         (SELECT COUNT(*) FROM room_transfers WHERE status NOT IN ('completed','aborted')${transferScope}) AS transfers`,
      sessionId === undefined ? [] : [sessionId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("room handoff pending-task count returned no row");
    const commands = number(row.commands);
    const outbox = number(row.outbox);
    const transfers = number(row.transfers);
    return { commands, outbox, transfers, total: commands + outbox + transfers };
  }

  /** Stores one replaceable confirmed checkpoint; uncommitted command state remains in room_commands. */
  async saveCheckpoint(input: {
    sessionId: string;
    ownerEpoch: number;
    checkpointId: string;
    snapshotSchemaVersion: number;
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
    commandSequence: number;
    checksum: string;
    snapshot: JsonValue;
    now: number;
  }): Promise<HandoffResult<RoomCheckpointRecord>> {
    return this.transaction(async (client) => {
      const session = await lockSession(client, input.sessionId);
      if (!session) return failure("session_not_found");
      if (number(session.owner_epoch) !== input.ownerEpoch) return failure("owner_epoch_mismatch");
      if (session.status !== "active") return failure("session_not_active");
      if (input.commandSequence > number(session.last_completed_command_sequence))
        return failure("command_not_completed");
      const previous = await client.query<{ command_sequence: string | number }>(
        "SELECT command_sequence FROM room_checkpoints WHERE session_id=$1",
        [input.sessionId],
      );
      if (previous.rows[0] && input.commandSequence < number(previous.rows[0].command_sequence))
        return failure("checkpoint_regression");
      const version = number(session.checkpoint_version) + 1;
      await client.query(
        `INSERT INTO room_checkpoints (
           session_id, checkpoint_id, checkpoint_version, snapshot_schema_version, execution_version,
           rules_version, source_revision, command_sequence, checksum, snapshot, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
         ON CONFLICT (session_id) DO UPDATE SET
           checkpoint_id=EXCLUDED.checkpoint_id,
           checkpoint_version=EXCLUDED.checkpoint_version,
           snapshot_schema_version=EXCLUDED.snapshot_schema_version,
           execution_version=EXCLUDED.execution_version,
           rules_version=EXCLUDED.rules_version,
           source_revision=EXCLUDED.source_revision,
           command_sequence=EXCLUDED.command_sequence,
           checksum=EXCLUDED.checksum,
           snapshot=EXCLUDED.snapshot,
           created_at=EXCLUDED.created_at`,
        [
          input.sessionId,
          input.checkpointId,
          version,
          input.snapshotSchemaVersion,
          input.executionVersion,
          input.rulesVersion,
          input.sourceRevision,
          input.commandSequence,
          input.checksum,
          JSON.stringify(input.snapshot),
          input.now,
        ],
      );
      await client.query("UPDATE room_sessions SET checkpoint_version=$2, updated_at=$3 WHERE id=$1", [
        input.sessionId,
        version,
        input.now,
      ]);
      const result = await client.query<CheckpointRow>("SELECT * FROM room_checkpoints WHERE session_id=$1", [
        input.sessionId,
      ]);
      return success(toCheckpoint(result.rows[0]!));
    });
  }

  /** Persists an intent before callers acknowledge it to the network. */
  async admitCommand(input: NewRoomCommand): Promise<HandoffResult<RoomCommandRecord>> {
    return this.transaction(async (client) => {
      const session = await lockSession(client, input.sessionId);
      if (!session) return failure("session_not_found");
      const existing = await client.query<CommandRow>(
        "SELECT * FROM room_commands WHERE session_id=$1 AND command_id=$2",
        [input.sessionId, input.commandId],
      );
      if (existing.rows[0]) {
        const prior = existing.rows[0];
        if (
          prior.participant_id !== input.participantId ||
          prior.seat !== input.seat ||
          number(prior.participant_sequence) !== input.participantSequence ||
          !sameJson(prior.payload, input.payload)
        )
          return failure("command_id_conflict");
        return success(toCommand(prior), true);
      }
      if (session.status !== "active") return failure("session_not_active");
      if (number(session.owner_epoch) !== input.ownerEpoch) return failure("owner_epoch_mismatch");
      if (session.active_transfer_id) return failure("transfer_in_progress");
      if (
        !session.participants.some(
          ({ principalId, seat }) => principalId === input.participantId && seat === input.seat,
        )
      )
        return failure("participant_not_seated");
      const cursor = await client.query<{ last_sequence: string | number }>(
        "SELECT last_sequence FROM room_participant_sequences WHERE session_id=$1 AND participant_id=$2 FOR UPDATE",
        [input.sessionId, input.participantId],
      );
      if (!cursor.rows[0]) return failure("participant_not_seated");
      const expectedParticipantSequence = number(cursor.rows[0].last_sequence) + 1;
      if (input.participantSequence < expectedParticipantSequence) return failure("participant_sequence_conflict");
      if (input.participantSequence > expectedParticipantSequence) return failure("participant_sequence_gap");
      const commandSequence = number(session.next_command_sequence);
      await client.query(
        `INSERT INTO room_commands (
           session_id, command_id, participant_id, seat, participant_sequence, command_sequence,
           owner_epoch, expected_revision, payload, status, admitted_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'admitted',$10)`,
        [
          input.sessionId,
          input.commandId,
          input.participantId,
          input.seat,
          input.participantSequence,
          commandSequence,
          input.ownerEpoch,
          input.expectedRevision ?? null,
          JSON.stringify(input.payload),
          input.now,
        ],
      );
      await client.query("UPDATE room_sessions SET next_command_sequence=$2, updated_at=$3 WHERE id=$1", [
        input.sessionId,
        commandSequence + 1,
        input.now,
      ]);
      await client.query(
        "UPDATE room_participant_sequences SET last_sequence=$3, updated_at=$4 WHERE session_id=$1 AND participant_id=$2",
        [input.sessionId, input.participantId, input.participantSequence, input.now],
      );
      const result = await client.query<CommandRow>(
        "SELECT * FROM room_commands WHERE session_id=$1 AND command_id=$2",
        [input.sessionId, input.commandId],
      );
      return success(toCommand(result.rows[0]!));
    });
  }

  /** Completes the next admitted command and its external effects in one transaction. */
  async completeCommand(input: {
    sessionId: string;
    commandId: string;
    ownerEpoch: number;
    status: "applied" | "rejected";
    result: JsonValue;
    now: number;
    outbox?: readonly NewOutboxEffect[];
    checkpoint?: {
      checkpointId: string;
      snapshotSchemaVersion: number;
      executionVersion: string;
      rulesVersion: string;
      sourceRevision: string;
      checksum: string;
      snapshot: JsonValue;
    };
  }): Promise<HandoffResult<RoomCommandRecord>> {
    return this.transaction(async (client) => {
      const session = await lockSession(client, input.sessionId);
      if (!session) return failure("session_not_found");
      const commandResult = await client.query<CommandRow>(
        "SELECT * FROM room_commands WHERE session_id=$1 AND command_id=$2 FOR UPDATE",
        [input.sessionId, input.commandId],
      );
      const command = commandResult.rows[0];
      if (!command) return failure("command_not_found");
      if (command.status !== "admitted") {
        if (command.status !== input.status || !sameJson(command.result, input.result))
          return failure("command_id_conflict");
        return success(toCommand(command), true);
      }
      if (session.status !== "active") return failure("session_not_active");
      if (number(session.owner_epoch) !== input.ownerEpoch) return failure("owner_epoch_mismatch");
      if (
        (input.outbox ?? []).some(
          (effect) => effect.sessionId !== input.sessionId || effect.ownerEpoch !== input.ownerEpoch,
        )
      )
        return failure("owner_epoch_mismatch");
      if (number(command.command_sequence) !== number(session.last_completed_command_sequence) + 1)
        return failure("command_sequence_gap");
      const nextCheckpointVersion = number(session.checkpoint_version) + 1;
      await client.query(
        `UPDATE room_commands SET status=$3, result=$4::jsonb, completed_at=$5
         WHERE session_id=$1 AND command_id=$2`,
        [input.sessionId, input.commandId, input.status, JSON.stringify(input.result), input.now],
      );
      await client.query("UPDATE room_sessions SET last_completed_command_sequence=$2, updated_at=$3 WHERE id=$1", [
        input.sessionId,
        command.command_sequence,
        input.now,
      ]);
      if (input.checkpoint) {
        await client.query(
          `INSERT INTO room_checkpoints (
             session_id, checkpoint_id, checkpoint_version, snapshot_schema_version, execution_version,
             rules_version, source_revision, command_sequence, checksum, snapshot, created_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
           ON CONFLICT (session_id) DO UPDATE SET
             checkpoint_id=EXCLUDED.checkpoint_id,
             checkpoint_version=EXCLUDED.checkpoint_version,
             snapshot_schema_version=EXCLUDED.snapshot_schema_version,
             execution_version=EXCLUDED.execution_version,
             rules_version=EXCLUDED.rules_version,
             source_revision=EXCLUDED.source_revision,
             command_sequence=EXCLUDED.command_sequence,
             checksum=EXCLUDED.checksum,
             snapshot=EXCLUDED.snapshot,
             created_at=EXCLUDED.created_at`,
          [
            input.sessionId,
            input.checkpoint.checkpointId,
            nextCheckpointVersion,
            input.checkpoint.snapshotSchemaVersion,
            input.checkpoint.executionVersion,
            input.checkpoint.rulesVersion,
            input.checkpoint.sourceRevision,
            command.command_sequence,
            input.checkpoint.checksum,
            JSON.stringify(input.checkpoint.snapshot),
            input.now,
          ],
        );
        await client.query("UPDATE room_sessions SET checkpoint_version=$2 WHERE id=$1", [
          input.sessionId,
          nextCheckpointVersion,
        ]);
        // A command recovered by the newly-active owner may advance the snapshot while its
        // transfer is still destination_active. Keep the transfer's recovery pointer atomic.
        if (session.active_transfer_id) {
          await client.query(
            `UPDATE room_transfers SET checkpoint_id=$2, updated_at=$3
             WHERE id=$1 AND session_id=$4 AND status='destination_active' AND to_owner_epoch=$5`,
            [session.active_transfer_id, input.checkpoint.checkpointId, input.now, input.sessionId, input.ownerEpoch],
          );
        }
      }
      for (const effect of input.outbox ?? []) {
        if (effect.sessionId !== input.sessionId || effect.ownerEpoch !== input.ownerEpoch)
          return failure("owner_epoch_mismatch");
        const outcome = await enqueueOutbox(client, effect);
        if (!outcome.ok) return outcome;
      }
      const updated = await client.query<CommandRow>(
        "SELECT * FROM room_commands WHERE session_id=$1 AND command_id=$2",
        [input.sessionId, input.commandId],
      );
      return success(toCommand(updated.rows[0]!));
    });
  }

  async beginTransfer(input: {
    transferId: string;
    sessionId: string;
    ownerEpoch: number;
    target: RoomOwner;
    now: number;
  }): Promise<HandoffResult<RoomTransferRecord>> {
    return this.transaction(async (client) => {
      const session = await lockSession(client, input.sessionId);
      if (!session) return failure("session_not_found");
      const prior = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [input.transferId]);
      if (prior.rows[0]) {
        const transfer = prior.rows[0];
        if (transfer.session_id !== input.sessionId || !sameOwner(transferTarget(transfer), input.target))
          return failure("transfer_state_mismatch");
        return success(toTransfer(transfer), true);
      }
      if (session.status !== "active") return failure("session_not_active");
      if (number(session.owner_epoch) !== input.ownerEpoch) return failure("owner_epoch_mismatch");
      if (session.active_transfer_id) return failure("transfer_in_progress");
      const source = sessionOwner(session);
      await client.query(
        `INSERT INTO room_transfers (
           id, session_id, from_generation_id, from_process_id, from_room_id,
           to_generation_id, to_process_id, to_room_id, from_owner_epoch, to_owner_epoch,
           status, started_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'preparing',$11,$11)`,
        [
          input.transferId,
          input.sessionId,
          source.generationId,
          source.processId,
          source.roomId,
          input.target.generationId,
          input.target.processId,
          input.target.roomId,
          input.ownerEpoch,
          input.ownerEpoch + 1,
          input.now,
        ],
      );
      await client.query("UPDATE room_sessions SET active_transfer_id=$2, updated_at=$3 WHERE id=$1", [
        input.sessionId,
        input.transferId,
        input.now,
      ]);
      const result = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [input.transferId]);
      return success(toTransfer(result.rows[0]!));
    });
  }

  async getTransfer(transferId: string): Promise<RoomTransferRecord | undefined> {
    await this.ensureReady();
    const result = await this.pool.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [transferId]);
    return result.rows[0] ? toTransfer(result.rows[0]) : undefined;
  }

  async advanceTransfer(input: {
    transferId: string;
    ownerEpoch: number;
    expected: "preparing" | "frozen" | "snapshot_saved";
    next: "frozen" | "snapshot_saved" | "destination_validated";
    checkpointId?: string;
    now: number;
  }): Promise<HandoffResult<RoomTransferRecord>> {
    return this.transaction(async (client) => {
      const transferRef = await client.query<{ session_id: string }>(
        "SELECT session_id FROM room_transfers WHERE id=$1",
        [input.transferId],
      );
      if (!transferRef.rows[0]) return failure("transfer_not_found");
      const session = await lockSession(client, transferRef.rows[0].session_id);
      if (!session) return failure("session_not_found");
      const transferResult = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1 FOR UPDATE", [
        input.transferId,
      ]);
      const transfer = transferResult.rows[0];
      if (!transfer) return failure("transfer_not_found");
      if (number(session.owner_epoch) !== input.ownerEpoch || number(transfer.from_owner_epoch) !== input.ownerEpoch)
        return failure("owner_epoch_mismatch");
      if (
        session.active_transfer_id !== input.transferId ||
        transfer.status !== input.expected ||
        TRANSFER_TRANSITIONS[input.expected] !== input.next
      )
        return failure("transfer_state_mismatch");
      let checkpointId = transfer.checkpoint_id;
      if (input.next === "snapshot_saved" || input.next === "destination_validated") {
        const checkpoint = await client.query<{ checkpoint_id: string }>(
          "SELECT checkpoint_id FROM room_checkpoints WHERE session_id=$1",
          [transfer.session_id],
        );
        if (!input.checkpointId || checkpoint.rows[0]?.checkpoint_id !== input.checkpointId)
          return failure("checkpoint_mismatch");
        checkpointId = input.checkpointId;
      }
      await client.query("UPDATE room_transfers SET status=$2, checkpoint_id=$3, updated_at=$4 WHERE id=$1", [
        input.transferId,
        input.next,
        checkpointId,
        input.now,
      ]);
      const updated = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [input.transferId]);
      return success(toTransfer(updated.rows[0]!));
    });
  }

  /** The linearization point: the only operation that increments and changes the current owner. */
  async claimTransfer(input: {
    transferId: string;
    expectedOwnerEpoch: number;
    now: number;
  }): Promise<HandoffResult<RoomSessionRecord>> {
    return this.transaction(async (client) => {
      const transferRef = await client.query<{ session_id: string }>(
        "SELECT session_id FROM room_transfers WHERE id=$1",
        [input.transferId],
      );
      if (!transferRef.rows[0]) return failure("transfer_not_found");
      const session = await lockSession(client, transferRef.rows[0].session_id);
      if (!session) return failure("session_not_found");
      const transferResult = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1 FOR UPDATE", [
        input.transferId,
      ]);
      const transfer = transferResult.rows[0];
      if (!transfer) return failure("transfer_not_found");
      if (
        ["owner_switched", "destination_active", "completed"].includes(transfer.status) &&
        number(session.owner_epoch) === number(transfer.to_owner_epoch) &&
        sameOwner(sessionOwner(session), transferTarget(transfer))
      )
        return success(toSession(session), true);
      if (
        number(session.owner_epoch) !== input.expectedOwnerEpoch ||
        number(transfer.from_owner_epoch) !== input.expectedOwnerEpoch
      )
        return failure("owner_epoch_mismatch");
      if (
        session.active_transfer_id !== input.transferId ||
        transfer.status !== "destination_validated" ||
        !transfer.checkpoint_id
      )
        return failure("transfer_state_mismatch");
      const checkpoint = await client.query<{ checkpoint_id: string }>(
        "SELECT checkpoint_id FROM room_checkpoints WHERE session_id=$1",
        [transfer.session_id],
      );
      if (checkpoint.rows[0]?.checkpoint_id !== transfer.checkpoint_id) return failure("checkpoint_mismatch");
      const claimed = await client.query<SessionRow>(
        `UPDATE room_sessions SET owner_generation_id=$3, owner_process_id=$4, owner_room_id=$5,
           owner_epoch=owner_epoch+1, updated_at=$6
         WHERE id=$1 AND owner_epoch=$2 AND active_transfer_id=$7
         RETURNING *`,
        [
          transfer.session_id,
          input.expectedOwnerEpoch,
          transfer.to_generation_id,
          transfer.to_process_id,
          transfer.to_room_id,
          input.now,
          input.transferId,
        ],
      );
      if (!claimed.rows[0]) return failure("owner_epoch_mismatch");
      await client.query(
        "UPDATE room_transfers SET status='owner_switched', committed_at=$2, updated_at=$2 WHERE id=$1 AND status='destination_validated'",
        [input.transferId, input.now],
      );
      return success(toSession(claimed.rows[0]));
    });
  }

  async activateTransfer(input: {
    transferId: string;
    ownerEpoch: number;
    now: number;
  }): Promise<HandoffResult<RoomTransferRecord>> {
    return this.finishTransferPhase(input, "owner_switched", "destination_active");
  }

  async completeTransfer(input: {
    transferId: string;
    ownerEpoch: number;
    now: number;
  }): Promise<HandoffResult<RoomTransferRecord>> {
    return this.transaction(async (client) => {
      const locked = await this.lockTransferAndSession(client, input.transferId);
      if (!locked) return failure("transfer_not_found");
      const { transfer, session } = locked;
      if (number(session.owner_epoch) !== input.ownerEpoch || number(transfer.to_owner_epoch) !== input.ownerEpoch)
        return failure("owner_epoch_mismatch");
      if (transfer.status === "completed") return success(toTransfer(transfer), true);
      if (transfer.status !== "destination_active" || session.active_transfer_id !== input.transferId)
        return failure("transfer_state_mismatch");
      await client.query("UPDATE room_transfers SET status='completed', completed_at=$2, updated_at=$2 WHERE id=$1", [
        input.transferId,
        input.now,
      ]);
      await client.query("UPDATE room_sessions SET active_transfer_id=NULL, updated_at=$2 WHERE id=$1", [
        transfer.session_id,
        input.now,
      ]);
      const updated = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [input.transferId]);
      return success(toTransfer(updated.rows[0]!));
    });
  }

  async abortTransfer(input: {
    transferId: string;
    ownerEpoch: number;
    failureCode: string;
    now: number;
  }): Promise<HandoffResult<RoomTransferRecord>> {
    return this.transaction(async (client) => {
      const locked = await this.lockTransferAndSession(client, input.transferId);
      if (!locked) return failure("transfer_not_found");
      const { transfer, session } = locked;
      if (number(session.owner_epoch) !== input.ownerEpoch || number(transfer.from_owner_epoch) !== input.ownerEpoch)
        return failure("owner_epoch_mismatch");
      if (transfer.status === "aborted") return success(toTransfer(transfer), true);
      if (
        ["owner_switched", "destination_active", "completed"].includes(transfer.status) ||
        session.active_transfer_id !== input.transferId
      )
        return failure("transfer_state_mismatch");
      await client.query("UPDATE room_transfers SET status='aborted', failure_code=$2, updated_at=$3 WHERE id=$1", [
        input.transferId,
        input.failureCode,
        input.now,
      ]);
      await client.query("UPDATE room_sessions SET active_transfer_id=NULL, updated_at=$2 WHERE id=$1", [
        transfer.session_id,
        input.now,
      ]);
      const updated = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [input.transferId]);
      return success(toTransfer(updated.rows[0]!));
    });
  }

  async enqueueOutbox(input: NewOutboxEffect): Promise<HandoffResult<RoomOutboxRecord>> {
    return this.transaction(async (client) => {
      const prior = await client.query<OutboxRow>("SELECT * FROM room_outbox WHERE effect_key=$1", [input.effectKey]);
      if (prior.rows[0]) return enqueueOutbox(client, input);
      const session = await lockSession(client, input.sessionId);
      if (!session) return failure("session_not_found");
      if (number(session.owner_epoch) !== input.ownerEpoch) return failure("owner_epoch_mismatch");
      return enqueueOutbox(client, input);
    });
  }

  async claimOutbox(input: {
    workerId: string;
    now: number;
    leaseMs: number;
    limit: number;
  }): Promise<RoomOutboxRecord[]> {
    return this.transaction(async (client) => {
      const claimable = await client.query<OutboxRow>(
        `SELECT * FROM room_outbox
         WHERE (status='pending' AND available_at <= $1)
            OR (status='claimed' AND claim_expires_at <= $1)
         ORDER BY available_at, created_at, id
         LIMIT $2 FOR UPDATE SKIP LOCKED`,
        [input.now, input.limit],
      );
      const claimed: RoomOutboxRecord[] = [];
      for (const row of claimable.rows) {
        const updated = await client.query<OutboxRow>(
          `UPDATE room_outbox SET status='claimed', claimed_by=$2, claim_expires_at=$3,
             attempt_count=attempt_count+1
           WHERE id=$1 RETURNING *`,
          [row.id, input.workerId, input.now + input.leaseMs],
        );
        if (updated.rows[0]) claimed.push(toOutbox(updated.rows[0]));
      }
      return claimed;
    });
  }

  async markOutboxDelivered(input: {
    id: string;
    workerId: string;
    now: number;
  }): Promise<HandoffResult<RoomOutboxRecord>> {
    return this.transaction(async (client) => {
      const result = await client.query<OutboxRow>(
        `UPDATE room_outbox SET status='delivered', delivered_at=$3, claimed_by=NULL, claim_expires_at=NULL
         WHERE id=$1 AND status='claimed' AND claimed_by=$2 AND claim_expires_at>$3 RETURNING *`,
        [input.id, input.workerId, input.now],
      );
      if (!result.rows[0]) return failure("outbox_claim_lost");
      return success(toOutbox(result.rows[0]));
    });
  }

  private async finishTransferPhase(
    input: { transferId: string; ownerEpoch: number; now: number },
    expected: "owner_switched",
    next: "destination_active",
  ): Promise<HandoffResult<RoomTransferRecord>> {
    return this.transaction(async (client) => {
      const locked = await this.lockTransferAndSession(client, input.transferId);
      if (!locked) return failure("transfer_not_found");
      const { transfer, session } = locked;
      if (number(session.owner_epoch) !== input.ownerEpoch || number(transfer.to_owner_epoch) !== input.ownerEpoch)
        return failure("owner_epoch_mismatch");
      if (transfer.status === next) return success(toTransfer(transfer), true);
      if (transfer.status !== expected || session.active_transfer_id !== input.transferId)
        return failure("transfer_state_mismatch");
      await client.query("UPDATE room_transfers SET status=$2, updated_at=$3 WHERE id=$1", [
        input.transferId,
        next,
        input.now,
      ]);
      const updated = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1", [input.transferId]);
      return success(toTransfer(updated.rows[0]!));
    });
  }

  private async lockTransfer(client: PoolClient, transferId: string): Promise<TransferRow | undefined> {
    const result = await client.query<TransferRow>("SELECT * FROM room_transfers WHERE id=$1 FOR UPDATE", [transferId]);
    return result.rows[0];
  }

  private async lockTransferAndSession(
    client: PoolClient,
    transferId: string,
  ): Promise<{ transfer: TransferRow; session: SessionRow } | undefined> {
    const reference = await client.query<{ session_id: string }>("SELECT session_id FROM room_transfers WHERE id=$1", [
      transferId,
    ]);
    if (!reference.rows[0]) return undefined;
    const session = await lockSession(client, reference.rows[0].session_id);
    if (!session) return undefined;
    const transfer = await this.lockTransfer(client, transferId);
    if (!transfer) return undefined;
    return { transfer, session };
  }

  private ensureReady(): Promise<void> {
    this.ready ??= runMigrations(this.pool, migrations)
      .then(() => undefined)
      .catch((error: unknown) => {
        this.ready = undefined;
        throw error;
      });
    return this.ready;
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    await this.ensureReady();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      if (isFailure(result)) {
        await client.query("ROLLBACK");
        return result;
      }
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

type CheckpointRow = {
  session_id: string;
  checkpoint_id: string;
  checkpoint_version: string | number;
  snapshot_schema_version: number;
  execution_version: string;
  rules_version: string;
  source_revision: string;
  command_sequence: string | number;
  checksum: string;
  snapshot: JsonValue;
  created_at: string | number;
};

async function lockSession(client: PoolClient, sessionId: string): Promise<SessionRow | undefined> {
  const result = await client.query<SessionRow>("SELECT * FROM room_sessions WHERE id=$1 FOR UPDATE", [sessionId]);
  return result.rows[0];
}

async function enqueueOutbox(client: PoolClient, input: NewOutboxEffect): Promise<HandoffResult<RoomOutboxRecord>> {
  const prior = await client.query<OutboxRow>("SELECT * FROM room_outbox WHERE effect_key=$1", [input.effectKey]);
  if (prior.rows[0]) {
    const existing = prior.rows[0];
    if (
      existing.session_id !== input.sessionId ||
      number(existing.owner_epoch) !== input.ownerEpoch ||
      existing.effect_type !== input.effectType ||
      !sameJson(existing.payload, input.payload)
    )
      return failure("effect_key_conflict");
    return success(toOutbox(existing), true);
  }
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO room_outbox (
       id, effect_key, session_id, owner_epoch, effect_type, payload, status, available_at, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,'pending',$7,$7)
     ON CONFLICT (effect_key) DO NOTHING RETURNING id`,
    [
      input.id,
      input.effectKey,
      input.sessionId,
      input.ownerEpoch,
      input.effectType,
      JSON.stringify(input.payload),
      input.now,
    ],
  );
  const result = await client.query<OutboxRow>("SELECT * FROM room_outbox WHERE effect_key=$1", [input.effectKey]);
  const row = result.rows[0];
  if (!row) throw new Error("outbox insert was not visible after write");
  if (
    row.session_id !== input.sessionId ||
    number(row.owner_epoch) !== input.ownerEpoch ||
    row.effect_type !== input.effectType ||
    !sameJson(row.payload, input.payload)
  )
    return failure("effect_key_conflict");
  return success(toOutbox(row), inserted.rows.length === 0);
}

function toSession(row: SessionRow): RoomSessionRecord {
  return {
    sessionId: row.id,
    mode: row.mode,
    status: row.status,
    participants: row.participants,
    tournamentMatchId: row.tournament_match_id,
    tournamentGameId: row.tournament_game_id,
    owner: sessionOwner(row),
    ownerEpoch: number(row.owner_epoch),
    checkpointVersion: number(row.checkpoint_version),
    nextCommandSequence: number(row.next_command_sequence),
    lastCompletedCommandSequence: number(row.last_completed_command_sequence),
    activeTransferId: row.active_transfer_id,
    createdAt: number(row.created_at),
    updatedAt: number(row.updated_at),
    completedAt: nullableNumber(row.completed_at),
    retentionUntil: nullableNumber(row.retention_until),
  };
}

function toCheckpoint(row: CheckpointRow): RoomCheckpointRecord {
  return {
    sessionId: row.session_id,
    checkpointId: row.checkpoint_id,
    checkpointVersion: number(row.checkpoint_version),
    snapshotSchemaVersion: row.snapshot_schema_version,
    executionVersion: row.execution_version,
    rulesVersion: row.rules_version,
    sourceRevision: row.source_revision,
    commandSequence: number(row.command_sequence),
    checksum: row.checksum,
    snapshot: row.snapshot,
    createdAt: number(row.created_at),
  };
}

function toCommand(row: CommandRow): RoomCommandRecord {
  return {
    sessionId: row.session_id,
    commandId: row.command_id,
    participantId: row.participant_id,
    seat: row.seat,
    participantSequence: number(row.participant_sequence),
    commandSequence: number(row.command_sequence),
    ownerEpoch: number(row.owner_epoch),
    expectedRevision: nullableNumber(row.expected_revision),
    payload: row.payload,
    status: row.status,
    result: row.result,
    admittedAt: number(row.admitted_at),
    completedAt: nullableNumber(row.completed_at),
  };
}

function toTransfer(row: TransferRow): RoomTransferRecord {
  return {
    transferId: row.id,
    sessionId: row.session_id,
    from: transferSource(row),
    to: transferTarget(row),
    fromOwnerEpoch: number(row.from_owner_epoch),
    toOwnerEpoch: number(row.to_owner_epoch),
    status: row.status,
    checkpointId: row.checkpoint_id,
    failureCode: row.failure_code,
    startedAt: number(row.started_at),
    updatedAt: number(row.updated_at),
    committedAt: nullableNumber(row.committed_at),
    completedAt: nullableNumber(row.completed_at),
  };
}

function toOutbox(row: OutboxRow): RoomOutboxRecord {
  return {
    id: row.id,
    effectKey: row.effect_key,
    sessionId: row.session_id,
    ownerEpoch: number(row.owner_epoch),
    effectType: row.effect_type,
    payload: row.payload,
    status: row.status,
    attemptCount: row.attempt_count,
    availableAt: number(row.available_at),
    claimedBy: row.claimed_by,
    claimExpiresAt: nullableNumber(row.claim_expires_at),
    createdAt: number(row.created_at),
    deliveredAt: nullableNumber(row.delivered_at),
    lastErrorCode: row.last_error_code,
  };
}

function sessionOwner(row: SessionRow): RoomOwner {
  return { generationId: row.owner_generation_id, processId: row.owner_process_id, roomId: row.owner_room_id };
}

function transferSource(row: TransferRow): RoomOwner {
  return { generationId: row.from_generation_id, processId: row.from_process_id, roomId: row.from_room_id };
}

function transferTarget(row: TransferRow): RoomOwner {
  return { generationId: row.to_generation_id, processId: row.to_process_id, roomId: row.to_room_id };
}

function success<T>(value: T, replayed = false): HandoffResult<T> {
  return { ok: true, value, replayed };
}

function failure<T = never>(reason: HandoffFailure): HandoffResult<T> {
  return { ok: false, reason };
}

function isFailure<T>(result: T): result is T & { ok: false; reason: HandoffFailure } {
  return typeof result === "object" && result !== null && "ok" in result && (result as { ok?: unknown }).ok === false;
}

function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function sameOwner(left: RoomOwner, right: RoomOwner): boolean {
  return left.generationId === right.generationId && left.processId === right.processId && left.roomId === right.roomId;
}

function sameSessionInput(
  row: SessionRow,
  input: {
    mode: string;
    participants: readonly RoomParticipant[];
    tournamentMatchId?: string | null;
    tournamentGameId?: string | null;
  },
): boolean {
  return (
    row.mode === input.mode &&
    sameJson(row.participants, input.participants) &&
    row.tournament_match_id === (input.tournamentMatchId ?? null) &&
    row.tournament_game_id === (input.tournamentGameId ?? null)
  );
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function number(value: string | number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`database integer is outside JavaScript's safe range: ${value}`);
  return parsed;
}

function nullableNumber(value: string | number | null): number | null {
  return value === null ? null : number(value);
}
