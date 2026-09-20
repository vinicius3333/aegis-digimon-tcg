import type { Express, NextFunction, Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import type {
  HandoffResult,
  RoomHandoffStore,
  RoomOwner,
  RoomSessionRecord,
  RoomTransferRecord,
} from "../db/roomHandoff/RoomHandoffStore.js";
import { issueSourceAuthorization, verifySourceAuthorization } from "./roomHandoffAuthorization.js";

export type HandoffCompatibility = {
  sessionId: string;
  roomId: string;
  ownerEpoch: number;
  compatible: boolean;
  reasonCode?: string;
};

/** Process/room operations are ports because room instances can live on another Colyseus worker. */
export interface RoomHandoffRoomPort {
  inspectSource(input: { session: RoomSessionRecord }): Promise<{ eligible: boolean; reasonCode?: string }>;
  reserveDestination(input: {
    transferId: string;
    session: RoomSessionRecord;
    ownerEpoch: number;
    reservationToken: string;
  }): Promise<RoomOwner>;
  freezeSource(input: { roomId: string; ownerEpoch: number; transferId: string }): Promise<boolean>;
  saveSourceCheckpoint(input: {
    roomId: string;
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
    commandSequence: number;
  }): Promise<boolean>;
  validateDestination(input: {
    roomId: string;
    sessionId: string;
    transferId: string;
    ownerEpoch: number;
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
  }): Promise<boolean>;
  activateDestination(input: { roomId: string; ownerEpoch: number }): Promise<boolean>;
  disposeSource(input: { roomId: string; ownerEpoch: number }): Promise<boolean>;
  unfreezeSource(input: { roomId: string }): Promise<boolean>;
  discardDestination(input: { roomId: string }): Promise<boolean>;
  authoritativePendingTasks?(generationId: string): Promise<number | undefined>;
}

export interface RoomHandoffCoordinatorOptions {
  generationId: string;
  processId: string;
  executionVersion?: string;
  rulesVersion?: string;
  sourceRevision?: string;
  authorizationSecret?: string;
  store: RoomHandoffStore;
  rooms: RoomHandoffRoomPort;
  now?: () => number;
}

export type LogicalReconnectResponse = { status: number; body: Record<string, unknown> };

/**
 * Validate the saved logical owner and reserve a normal Colyseus seat with a fresh, single-use
 * account room ticket. The resume credential is never forwarded to the room/client transport.
 */
export function createLogicalRoomReconnectHandler(input: {
  coordinator: Pick<RoomHandoffCoordinator, "resolveOwner">;
  currentGenerationId: string;
  verifyResumeCredential: (gameId: string, credential: string) => Promise<string | undefined>;
  createRoomTicket: (accountId: string) => Promise<string>;
  joinById: (roomId: string, options: { authTicket: string }) => Promise<unknown>;
}): (body: unknown) => Promise<LogicalReconnectResponse> {
  return async (body) => {
    if (!isRecord(body)) return reconnectError(400, "ROOM_RECONNECT_REQUEST_INVALID");
    const { gameId, resumeCredential, physicalRoomId, ownerEpoch } = body;
    if (
      typeof gameId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(gameId) ||
      typeof resumeCredential !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(resumeCredential) ||
      typeof physicalRoomId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(physicalRoomId) ||
      typeof ownerEpoch !== "number" ||
      !Number.isSafeInteger(ownerEpoch) ||
      ownerEpoch < 1
    )
      return reconnectError(400, "ROOM_RECONNECT_REQUEST_INVALID");

    let participantId: string | undefined;
    try {
      participantId = await input.verifyResumeCredential(gameId, resumeCredential);
    } catch {
      return reconnectError(503, "ROOM_RECONNECT_UNAVAILABLE");
    }
    if (!participantId) return reconnectError(401, "ROOM_RESUME_CREDENTIAL_INVALID");

    let current: Awaited<ReturnType<RoomHandoffCoordinator["resolveOwner"]>>;
    try {
      current = await input.coordinator.resolveOwner({ gameId, participantId, minimumOwnerEpoch: ownerEpoch });
    } catch (error) {
      if (error instanceof HandoffHttpError && error.status === 404)
        return reconnectError(404, "ROOM_SESSION_UNAVAILABLE");
      if (error instanceof HandoffHttpError && error.status === 409)
        return { status: 409, body: { error: error.code, ...(error.details ?? {}) } };
      return reconnectError(503, "ROOM_RECONNECT_UNAVAILABLE");
    }

    if (
      current.owner.generationId !== input.currentGenerationId ||
      current.owner.roomId !== physicalRoomId ||
      current.ownerEpoch !== ownerEpoch
    ) {
      return {
        status: 409,
        body: {
          error: current.ownerEpoch !== ownerEpoch ? "ROOM_OWNER_EPOCH_STALE" : "ROOM_OWNER_STALE",
          slot: current.owner.generationId,
          physicalRoomId: current.owner.roomId,
          ownerEpoch: current.ownerEpoch,
        },
      };
    }

    let seatReservation: unknown;
    try {
      const authTicket = await input.createRoomTicket(participantId);
      seatReservation = await input.joinById(current.owner.roomId, { authTicket });
    } catch (error) {
      const code = isRecord(error) && typeof error.code === "number" ? error.code : undefined;
      if (code === 4212) return reconnectError(409, "ROOM_OWNER_STALE");
      if (code === 4215 || (isRecord(error) && typeof error.message === "string" && error.message.includes("already full")))
        return reconnectError(409, "ROOM_RECONNECT_REJECTED");
      return reconnectError(503, "ROOM_RECONNECT_UNAVAILABLE");
    }

    if (!isRecord(seatReservation) || !isRecord(seatReservation.room) || seatReservation.room.roomId !== current.owner.roomId)
      return reconnectError(503, "ROOM_RECONNECT_UNAVAILABLE");

    // Fence the reservation against a transfer that raced the first lookup. A seat on the old
    // owner is harmless because its room is frozen, but it must never be returned to the client.
    try {
      const confirmed = await input.coordinator.resolveOwner({ gameId, participantId, minimumOwnerEpoch: ownerEpoch });
      if (
        confirmed.owner.generationId !== current.owner.generationId ||
        confirmed.owner.roomId !== current.owner.roomId ||
        confirmed.ownerEpoch !== current.ownerEpoch
      ) {
        return {
          status: 409,
          body: {
            error: "ROOM_OWNER_EPOCH_STALE",
            slot: confirmed.owner.generationId,
            physicalRoomId: confirmed.owner.roomId,
            ownerEpoch: confirmed.ownerEpoch,
          },
        };
      }
    } catch {
      return reconnectError(503, "ROOM_RECONNECT_UNAVAILABLE");
    }
    return { status: 200, body: seatReservation };
  };
}

function reconnectError(status: number, error: string): LogicalReconnectResponse {
  return { status, body: { error } };
}

/**
 * One per-process handoff coordinator. The database owns transfer phases and owner epochs;
 * room and deployment control operations are delegated to explicit process-local/remote ports.
 */
export class RoomHandoffCoordinator {
  private readonly now: () => number;

  constructor(private readonly options: RoomHandoffCoordinatorOptions) {
    this.now = options.now ?? Date.now;
  }

  async checkCompatibility(input: {
    sourceGenerationId: string;
    destinationGenerationId: string;
  }): Promise<{
    compatible: boolean;
    rooms: HandoffCompatibility[];
    blockers: string[];
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
  }> {
    this.assertGeneration(input.sourceGenerationId);
    assertGeneration(input.destinationGenerationId);
    if (input.sourceGenerationId === input.destinationGenerationId) throw new HandoffHttpError(400, "invalid_generations");

    const sessions = await this.options.store.listActiveSessionsByGeneration(input.sourceGenerationId);
    const rooms: HandoffCompatibility[] = [];
    for (const session of sessions) {
      let result: { eligible: boolean; reasonCode?: string };
      try {
        result = await this.options.rooms.inspectSource({ session });
      } catch {
        result = { eligible: false, reasonCode: "source_unavailable" };
      }
      const scopeEligible =
        session.mode === "casual" &&
        session.tournamentMatchId === null &&
        session.tournamentGameId === null &&
        session.participants.length === 2 &&
        session.participants.every((participant) => participant.kind === "account");
      const compatible = result.eligible && scopeEligible;
      rooms.push({
        sessionId: session.sessionId,
        roomId: session.owner.roomId,
        ownerEpoch: session.ownerEpoch,
        compatible,
        ...(!compatible ? { reasonCode: safeReasonCode(result.reasonCode) ?? (scopeEligible ? "room_not_quiescent" : "unsupported_room_mode") } : {}),
      });
    }
    const blockers = rooms.filter((room) => !room.compatible).map(({ roomId }) => roomId);
    return {
      compatible: blockers.length === 0,
      rooms,
      blockers,
      executionVersion: this.options.executionVersion ?? "engine-v1",
      rulesVersion: this.options.rulesVersion ?? "rules-v1",
      sourceRevision: this.options.sourceRevision ?? "development",
    };
  }

  /** Reserves the inert target first, then commits its location as the transfer's target. */
  async authorizeDestination(input: {
    transferId: string;
    sessionId: string;
    expectedOwnerEpoch: number;
    sourceGenerationId: string;
    destinationGenerationId: string;
  }): Promise<{ sourceAuthorization: string }> {
    this.assertGeneration(input.sourceGenerationId);
    assertGeneration(input.destinationGenerationId);
    assertId(input.transferId, "transferId");
    assertId(input.sessionId, "sessionId");
    assertEpoch(input.expectedOwnerEpoch);
    const session = await this.requireSourceSession(input.sessionId, input.sourceGenerationId, input.expectedOwnerEpoch);
    const eligibility = await this.options.rooms.inspectSource({ session });
    if (!eligibility.eligible)
      throw new HandoffHttpError(409, safeReasonCode(eligibility.reasonCode) ?? "room_not_eligible");
    try {
      return {
        sourceAuthorization: issueSourceAuthorization({
          secret: this.descriptorSecret(),
          transferId: input.transferId,
          sessionId: session.sessionId,
          sourceGenerationId: input.sourceGenerationId,
          destinationGenerationId: input.destinationGenerationId,
          sourceOwnerEpoch: session.ownerEpoch,
          sourceOwner: session.owner,
          now: this.now(),
        }),
      };
    } catch {
      throw new HandoffHttpError(503, "handoff_descriptor_signing_unavailable");
    }
  }

  /**
   * Destination reservation validates a source-signed inspection descriptor. In particular, it
   * never tries to discover/call the source room in this slot's isolated Colyseus/Redis namespace.
   */
  async reserveDestination(input: {
    transferId: string;
    sessionId: string;
    expectedOwnerEpoch: number;
    sourceGenerationId: string;
    destinationGenerationId: string;
    sourceAuthorization?: string;
  }): Promise<{ transfer: RoomTransferRecord; target: RoomOwner }> {
    this.assertGeneration(input.destinationGenerationId);
    assertId(input.transferId, "transferId");
    assertId(input.sessionId, "sessionId");
    assertEpoch(input.expectedOwnerEpoch);
    assertGeneration(input.sourceGenerationId);
    const existing = await this.options.store.getTransfer(input.transferId);
    if (existing) {
      assertTransferIdentity(existing, input);
      if (existing.to.generationId !== input.destinationGenerationId)
        throw new HandoffHttpError(409, "transfer_destination_mismatch");
      return { transfer: existing, target: existing.to };
    }
    const session = await this.requireSourceSession(input.sessionId, input.sourceGenerationId, input.expectedOwnerEpoch);
    let authorized: boolean | undefined;
    try {
      const verified = input.sourceAuthorization
        ? verifySourceAuthorization({
            secret: this.descriptorSecret(),
            token: input.sourceAuthorization,
            now: this.now(),
            transferId: input.transferId,
            sessionId: session.sessionId,
            sourceGenerationId: input.sourceGenerationId,
            destinationGenerationId: input.destinationGenerationId,
            sourceOwnerEpoch: session.ownerEpoch,
            sourceOwner: session.owner,
          })
        : undefined;
      authorized = verified !== undefined;
    } catch {
      authorized = false;
    }
    if (!authorized) throw new HandoffHttpError(409, "source_authorization_invalid");
    const priorReservation = await this.options.store.getRoomHandoffReservation(input.transferId);
    if (priorReservation) {
      if (
        priorReservation.sessionId !== input.sessionId ||
        priorReservation.sourceOwnerEpoch !== input.expectedOwnerEpoch ||
        priorReservation.destinationGenerationId !== input.destinationGenerationId ||
        priorReservation.ownerEpoch !== input.expectedOwnerEpoch + 1
      )
        throw new HandoffHttpError(409, "reservation_identity_mismatch");
      const target = {
        generationId: priorReservation.destinationGenerationId,
        processId: priorReservation.processId,
        roomId: priorReservation.roomId,
      };
      const recovered = await this.options.store.beginTransfer({
        transferId: input.transferId,
        sessionId: session.sessionId,
        ownerEpoch: session.ownerEpoch,
        target,
        now: this.now(),
      });
      if (!recovered.ok) throw resultError(recovered);
      await this.options.store.removeConsumedRoomHandoffReservation(input.transferId).catch(() => false);
      return {
        transfer: recovered.value,
        target,
      };
    }

    const reservationToken = randomBytes(32).toString("base64url");
    const reservationTokenHash = createHash("sha256").update(reservationToken).digest("hex");
    const now = this.now();
    let reservationCreated: boolean;
    try {
      reservationCreated = await this.options.store.createRoomHandoffReservation({
        transferId: input.transferId,
        sessionId: session.sessionId,
        sourceOwnerEpoch: session.ownerEpoch,
        destinationGenerationId: input.destinationGenerationId,
        ownerEpoch: input.expectedOwnerEpoch + 1,
        tokenHash: reservationTokenHash,
        now,
        expiresAt: now + 120_000,
      });
    } catch {
      throw new HandoffHttpError(409, "destination_reservation_conflict");
    }
    if (!reservationCreated) {
      const consumed = await this.options.store.getRoomHandoffReservation(input.transferId);
      if (!consumed) throw new HandoffHttpError(409, "destination_reservation_conflict");
      const target = {
        generationId: consumed.destinationGenerationId,
        processId: consumed.processId,
        roomId: consumed.roomId,
      };
      if (
        consumed.sessionId !== input.sessionId ||
        consumed.sourceOwnerEpoch !== input.expectedOwnerEpoch ||
        consumed.destinationGenerationId !== input.destinationGenerationId ||
        consumed.ownerEpoch !== input.expectedOwnerEpoch + 1
      )
        throw new HandoffHttpError(409, "reservation_identity_mismatch");
      const recovered = await this.options.store.beginTransfer({
        transferId: input.transferId,
        sessionId: session.sessionId,
        ownerEpoch: session.ownerEpoch,
        target,
        now: this.now(),
      });
      if (!recovered.ok) throw resultError(recovered);
      await this.options.store.removeConsumedRoomHandoffReservation(input.transferId).catch(() => false);
      return { transfer: recovered.value, target };
    }

    let target: RoomOwner;
    try {
      target = await this.options.rooms.reserveDestination({
        transferId: input.transferId,
        session,
        ownerEpoch: input.expectedOwnerEpoch + 1,
        reservationToken,
      });
    } catch (error) {
      await this.options.store.cancelRoomHandoffReservation({
        transferId: input.transferId,
        tokenHash: reservationTokenHash,
      }).catch(() => false);
      throw error;
    }
    if (target.generationId !== input.destinationGenerationId) {
      await this.options.store.cancelRoomHandoffReservation({
        transferId: input.transferId,
        tokenHash: reservationTokenHash,
      }).catch(() => false);
      await this.options.rooms.discardDestination({ roomId: target.roomId }).catch(() => false);
      throw new HandoffHttpError(409, "destination_generation_mismatch");
    }
    const created = await this.options.store.beginTransfer({
      transferId: input.transferId,
      sessionId: session.sessionId,
      ownerEpoch: session.ownerEpoch,
      target,
      now: this.now(),
    });
    if (!created.ok) {
      await this.options.store.cancelRoomHandoffReservation({
        transferId: input.transferId,
        tokenHash: reservationTokenHash,
      }).catch(() => false);
      await this.options.store.removeConsumedRoomHandoffReservation(input.transferId).catch(() => false);
      await this.options.rooms.discardDestination({ roomId: target.roomId }).catch(() => false);
      throw resultError(created);
    }
    await this.options.store.removeConsumedRoomHandoffReservation(input.transferId).catch(() => false);
    return { transfer: created.value, target };
  }

  /** Freezes the current source and persists the final settled-Main checkpoint. */
  async prepareSource(input: {
    transferId: string;
    sourceGenerationId: string;
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
  }): Promise<RoomTransferRecord> {
    this.assertGeneration(input.sourceGenerationId);
    const transfer = await this.requireTransfer(input.transferId);
    assertSourceTransfer(transfer, input.sourceGenerationId);
    let current = transfer;
    if (current.status === "preparing") {
      if (!(await this.options.rooms.freezeSource({
        roomId: current.from.roomId,
        ownerEpoch: current.fromOwnerEpoch,
        transferId: current.transferId,
      }))) {
        await this.abortTransfer(current.transferId, input.sourceGenerationId);
        throw new HandoffHttpError(409, "source_freeze_rejected");
      }
      current = valueOrThrow(await this.options.store.advanceTransfer({
        transferId: current.transferId,
        ownerEpoch: current.fromOwnerEpoch,
        expected: "preparing",
        next: "frozen",
        now: this.now(),
      }));
    }
    if (current.status === "frozen") {
      const checkpoint = await this.options.store.getCheckpoint(current.sessionId);
      if (!checkpoint || checkpoint.checkpointId !== current.checkpointId) {
        const saved = await this.options.rooms.saveSourceCheckpoint({
          roomId: current.from.roomId,
          executionVersion: input.executionVersion,
          rulesVersion: input.rulesVersion,
          sourceRevision: input.sourceRevision,
          commandSequence: (await this.options.store.getSession(current.sessionId))?.lastCompletedCommandSequence ?? 0,
        });
        const persisted = await this.options.store.getCheckpoint(current.sessionId);
        if (!saved || !persisted) {
          await this.abortTransfer(current.transferId, input.sourceGenerationId);
          throw new HandoffHttpError(409, "source_checkpoint_rejected");
        }
        return valueOrThrow(await this.options.store.advanceTransfer({
          transferId: current.transferId,
          ownerEpoch: current.fromOwnerEpoch,
          expected: "frozen",
          next: "snapshot_saved",
          checkpointId: persisted.checkpointId,
          now: this.now(),
        }));
      }
      current = valueOrThrow(await this.options.store.advanceTransfer({
        transferId: current.transferId,
        ownerEpoch: current.fromOwnerEpoch,
        expected: "frozen",
        next: "snapshot_saved",
        checkpointId: checkpoint.checkpointId,
        now: this.now(),
      }));
    }
    return current;
  }

  /** Destination restores and validates the final checkpoint while remaining inert. */
  async validateDestination(input: {
    transferId: string;
    destinationGenerationId: string;
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
  }): Promise<RoomTransferRecord> {
    this.assertGeneration(input.destinationGenerationId);
    const transfer = await this.requireTransfer(input.transferId);
    if (transfer.to.generationId !== input.destinationGenerationId) throw new HandoffHttpError(409, "wrong_destination_generation");
    if (
      input.executionVersion !== (this.options.executionVersion ?? "engine-v1") ||
      input.rulesVersion !== (this.options.rulesVersion ?? "rules-v1")
    )
      throw new HandoffHttpError(409, "incompatible_execution_version");
    if (transfer.status === "destination_validated" || isAtOrAfterOwnerSwitch(transfer.status)) return transfer;
    if (transfer.status !== "snapshot_saved") throw new HandoffHttpError(409, "transfer_not_snapshot_saved");
    const valid = await this.options.rooms.validateDestination({
      roomId: transfer.to.roomId,
      sessionId: transfer.sessionId,
      transferId: transfer.transferId,
      ownerEpoch: transfer.toOwnerEpoch,
      executionVersion: input.executionVersion,
      rulesVersion: input.rulesVersion,
      sourceRevision: input.sourceRevision,
    });
    if (!valid) throw new HandoffHttpError(409, "destination_validation_rejected");
    return valueOrThrow(await this.options.store.advanceTransfer({
      transferId: transfer.transferId,
      ownerEpoch: transfer.fromOwnerEpoch,
      expected: "snapshot_saved",
      next: "destination_validated",
      checkpointId: transfer.checkpointId ?? undefined,
      now: this.now(),
    }));
  }

  /** The only ownership linearization point; after this method succeeds abort is forbidden. */
  async claimOwner(input: { transferId: string; sourceGenerationId: string }): Promise<RoomSessionRecord> {
    this.assertGeneration(input.sourceGenerationId);
    const transfer = await this.requireTransfer(input.transferId);
    assertSourceTransfer(transfer, input.sourceGenerationId);
    return valueOrThrow(await this.options.store.claimTransfer({
      transferId: transfer.transferId,
      expectedOwnerEpoch: transfer.fromOwnerEpoch,
      now: this.now(),
    }));
  }

  /** Destination activation and durable completion are retry-safe after owner commit. */
  async activateAndComplete(input: { transferId: string; destinationGenerationId: string }): Promise<RoomTransferRecord> {
    this.assertGeneration(input.destinationGenerationId);
    const transfer = await this.requireTransfer(input.transferId);
    if (transfer.to.generationId !== input.destinationGenerationId) throw new HandoffHttpError(409, "wrong_destination_generation");
    if (transfer.status === "completed") return transfer;
    if (transfer.status === "owner_switched") {
      valueOrThrow(await this.options.store.activateTransfer({
        transferId: transfer.transferId,
        ownerEpoch: transfer.toOwnerEpoch,
        now: this.now(),
      }));
    } else if (transfer.status !== "destination_active") {
      throw new HandoffHttpError(409, "owner_not_switched");
    }
    if (!(await this.options.rooms.activateDestination({ roomId: transfer.to.roomId, ownerEpoch: transfer.toOwnerEpoch }))) {
      throw new HandoffHttpError(503, "destination_activation_pending");
    }
    return valueOrThrow(await this.options.store.completeTransfer({
      transferId: transfer.transferId,
      ownerEpoch: transfer.toOwnerEpoch,
      now: this.now(),
    }));
  }

  /** Old source disposal is separate so it can be retried after the destination completed. */
  async disposeOldOwner(input: { transferId: string; sourceGenerationId: string }): Promise<RoomTransferRecord> {
    this.assertGeneration(input.sourceGenerationId);
    const transfer = await this.requireTransfer(input.transferId);
    assertSourceTransfer(transfer, input.sourceGenerationId);
    if (transfer.status !== "completed") throw new HandoffHttpError(409, "transfer_not_completed");
    if (!(await this.options.rooms.disposeSource({ roomId: transfer.from.roomId, ownerEpoch: transfer.toOwnerEpoch }))) {
      throw new HandoffHttpError(503, "source_disposal_pending");
    }
    return transfer;
  }

  /** Reconciliation reads the database as authority and never guesses from a lost HTTP response. */
  async reconcile(transferId: string): Promise<{ transfer: RoomTransferRecord; owner: RoomOwner; ownerEpoch: number }> {
    const transfer = await this.requireTransfer(transferId);
    const session = await this.options.store.getSession(transfer.sessionId);
    if (!session) throw new HandoffHttpError(404, "session_not_found");
    return { transfer, owner: session.owner, ownerEpoch: session.ownerEpoch };
  }

  async abortTransfer(transferId: string, sourceGenerationId: string): Promise<RoomTransferRecord> {
    this.assertGeneration(sourceGenerationId);
    const transfer = await this.requireTransfer(transferId);
    assertSourceTransfer(transfer, sourceGenerationId);
    if (isAtOrAfterOwnerSwitch(transfer.status)) throw new HandoffHttpError(409, "owner_already_switched");
    const aborted = transfer.status === "aborted"
      ? transfer
      : valueOrThrow(await this.options.store.abortTransfer({
          transferId,
          ownerEpoch: transfer.fromOwnerEpoch,
          failureCode: "operator_abort",
          now: this.now(),
        }));
    if (!(await this.options.rooms.unfreezeSource({ roomId: transfer.from.roomId })))
      throw new HandoffHttpError(503, "source_unfreeze_pending");
    return aborted;
  }

  /** Cross-slot cleanup is routed through the destination slot's own Colyseus matchmaker. */
  async discardAbortedDestination(input: { transferId: string; destinationGenerationId: string }): Promise<RoomTransferRecord> {
    this.assertGeneration(input.destinationGenerationId);
    const transfer = await this.requireTransfer(input.transferId);
    if (transfer.to.generationId !== input.destinationGenerationId) throw new HandoffHttpError(409, "wrong_destination_generation");
    if (transfer.status !== "aborted") throw new HandoffHttpError(409, "transfer_not_aborted");
    if (!(await this.options.rooms.discardDestination({ roomId: transfer.to.roomId })))
      throw new HandoffHttpError(503, "destination_discard_pending");
    return transfer;
  }

  async status(transferId: string): Promise<{ transfer: RoomTransferRecord; owner: RoomOwner; ownerEpoch: number }> {
    return this.reconcile(transferId);
  }

  /** Resolve only after a separate resume credential verifier authenticates a seated account. */
  async resolveOwner(input: {
    gameId: string;
    participantId: string;
    minimumOwnerEpoch?: number;
  }): Promise<{ gameId: string; owner: RoomOwner; ownerEpoch: number }> {
    assertId(input.gameId, "gameId");
    const session = await this.options.store.getSession(input.gameId);
    if (
      !session ||
      session.status !== "active" ||
      !session.participants.some((participant) => participant.kind === "account" && participant.principalId === input.participantId)
    )
      throw new HandoffHttpError(404, "ROOM_SESSION_UNAVAILABLE");
    if (input.minimumOwnerEpoch !== undefined && input.minimumOwnerEpoch > session.ownerEpoch)
      throw new HandoffHttpError(409, "ROOM_OWNER_EPOCH_STALE", { ownerEpoch: session.ownerEpoch });
    return { gameId: session.sessionId, owner: session.owner, ownerEpoch: session.ownerEpoch };
  }

  async cleanupSafety(generationId: string): Promise<{
    slot: string;
    ownershipVerified: boolean;
    authoritativeRooms: number;
    inFlightTransfers: number;
    pendingTasks: number | null;
  }> {
    this.assertGeneration(generationId);
    const sessions = await this.options.store.listActiveSessionsByGeneration(generationId);
    const transfers = await this.options.store.listInFlightTransfersByGeneration(generationId);
    const pendingTasks = await this.options.rooms.authoritativePendingTasks?.(generationId);
    return {
      slot: generationId,
      ownershipVerified: pendingTasks !== undefined,
      authoritativeRooms: sessions.length,
      inFlightTransfers: transfers.length,
      pendingTasks: pendingTasks ?? null,
    };
  }

  private async requireSourceSession(sessionId: string, generationId: string, ownerEpoch: number) {
    const session = await this.options.store.getSession(sessionId);
    if (!session) throw new HandoffHttpError(404, "session_not_found");
    if (session.status !== "active") throw new HandoffHttpError(409, "session_not_active");
    if (session.owner.generationId !== generationId || session.ownerEpoch !== ownerEpoch)
      throw new HandoffHttpError(409, "stale_source_owner");
    return session;
  }

  private async requireTransfer(transferId: string) {
    assertId(transferId, "transferId");
    const transfer = await this.options.store.getTransfer(transferId);
    if (!transfer) throw new HandoffHttpError(404, "transfer_not_found");
    return transfer;
  }

  private assertGeneration(generationId: string) {
    assertGeneration(generationId);
    if (generationId !== this.options.generationId) throw new HandoffHttpError(409, "wrong_generation");
  }

  private descriptorSecret(): string | undefined {
    return this.options.authorizationSecret ?? process.env.AEGIS_ROOM_HANDOFF_DESCRIPTOR_SECRET;
  }
}

export interface HandoffAdminRuntime {
  isAuthorized(authorization: string | undefined): boolean;
}

/** Admin-only route surface. If capability is off, every route fails closed with 404. */
export function installRoomHandoffRoutes(input: {
  app: Express;
  runtime: HandoffAdminRuntime;
  coordinator?: RoomHandoffCoordinator;
  enabled?: boolean;
}): void {
  const admin = (request: Request, response: Response, next: NextFunction) => {
    if (!input.runtime.isAuthorized(request.header("authorization"))) {
      response.sendStatus(401);
      return;
    }
    if (input.enabled !== true || !input.coordinator) {
      response.sendStatus(404);
      return;
    }
    next();
  };
  const run = (work: (request: Request) => Promise<unknown>) => async (request: Request, response: Response) => {
    try {
      response.json(await work(request));
    } catch (error) {
      const status = error instanceof HandoffHttpError ? error.status : 503;
      const code = error instanceof HandoffHttpError ? error.code : "handoff_unavailable";
      response.status(status).json({ error: code });
    }
  };
  const coordinator = () => {
    if (!input.coordinator) throw new HandoffHttpError(404, "handoff_disabled");
    return input.coordinator;
  };
  const body = (request: Request) => (isRecord(request.body) ? request.body : {});

  input.app.post("/deployment/handoff/compatibility", admin, run((request) => {
    const value = body(request);
    return coordinator().checkCompatibility({
      sourceGenerationId: requiredString(value.sourceSlot, "sourceSlot"),
      destinationGenerationId: requiredString(value.destinationSlot, "destinationSlot"),
    });
  }));
  input.app.post("/deployment/handoff/destinations/reserve", admin, run((request) => {
    const value = body(request);
    return coordinator().reserveDestination({
      transferId: requiredString(value.transferId, "transferId"),
      sessionId: requiredString(value.sessionId, "sessionId"),
      expectedOwnerEpoch: requiredInteger(value.expectedOwnerEpoch, "expectedOwnerEpoch"),
      sourceGenerationId: requiredString(value.sourceSlot, "sourceSlot"),
      destinationGenerationId: requiredString(value.destinationSlot, "destinationSlot"),
      sourceAuthorization: requiredString(value.sourceAuthorization, "sourceAuthorization"),
    });
  }));
  input.app.post("/deployment/handoff/authorize-destination", admin, run((request) => {
    const value = body(request);
    return coordinator().authorizeDestination({
      transferId: requiredString(value.transferId, "transferId"),
      sessionId: requiredString(value.sessionId, "sessionId"),
      expectedOwnerEpoch: requiredInteger(value.expectedOwnerEpoch, "expectedOwnerEpoch"),
      sourceGenerationId: requiredString(value.sourceSlot, "sourceSlot"),
      destinationGenerationId: requiredString(value.destinationSlot, "destinationSlot"),
    });
  }));
  input.app.post("/deployment/handoff/prepare", admin, run((request) => {
    const value = body(request);
    return coordinator().prepareSource({
      transferId: requiredString(value.transferId, "transferId"),
      sourceGenerationId: requiredString(value.sourceSlot, "sourceSlot"),
      executionVersion: requiredString(value.executionVersion, "executionVersion"),
      rulesVersion: requiredString(value.rulesVersion, "rulesVersion"),
      sourceRevision: requiredString(value.sourceRevision, "sourceRevision"),
    });
  }));
  input.app.post("/deployment/handoff/transfers/:transferId/validate", admin, run((request) => {
    const value = body(request);
    return coordinator().validateDestination({
      transferId: requiredPathId(request.params.transferId, "transferId"),
      destinationGenerationId: requiredString(value.destinationSlot, "destinationSlot"),
      executionVersion: requiredString(value.executionVersion, "executionVersion"),
      rulesVersion: requiredString(value.rulesVersion, "rulesVersion"),
      sourceRevision: requiredString(value.sourceRevision, "sourceRevision"),
    });
  }));
  input.app.post("/deployment/handoff/transfers/:transferId/migrate", admin, run((request) =>
    coordinator().claimOwner({
      transferId: requiredPathId(request.params.transferId, "transferId"),
      sourceGenerationId: requiredString(body(request).sourceSlot, "sourceSlot"),
    }),
  ));
  input.app.post("/deployment/handoff/transfers/:transferId/activate", admin, run((request) =>
    coordinator().activateAndComplete({
      transferId: requiredPathId(request.params.transferId, "transferId"),
      destinationGenerationId: requiredString(body(request).destinationSlot, "destinationSlot"),
    }),
  ));
  input.app.post("/deployment/handoff/transfers/:transferId/complete", admin, run((request) =>
    coordinator().disposeOldOwner({
      transferId: requiredPathId(request.params.transferId, "transferId"),
      sourceGenerationId: requiredString(body(request).sourceSlot, "sourceSlot"),
    }),
  ));
  input.app.get("/deployment/handoff/transfers/:transferId", admin, run((request) =>
    coordinator().status(requiredPathId(request.params.transferId, "transferId")),
  ));
  input.app.post("/deployment/handoff/transfers/:transferId/reconcile", admin, run((request) =>
    coordinator().reconcile(requiredPathId(request.params.transferId, "transferId")),
  ));
  input.app.post("/deployment/handoff/transfers/:transferId/abort", admin, run((request) =>
    coordinator().abortTransfer(requiredPathId(request.params.transferId, "transferId"), requiredString(body(request).sourceSlot, "sourceSlot")),
  ));
  input.app.post("/deployment/handoff/transfers/:transferId/discard", admin, run((request) =>
    coordinator().discardAbortedDestination({
      transferId: requiredPathId(request.params.transferId, "transferId"),
      destinationGenerationId: requiredString(body(request).destinationSlot, "destinationSlot"),
    }),
  ));
  input.app.get("/deployment/handoff/cleanup-safety", admin, run((request) =>
    coordinator().cleanupSafety(requiredString(request.query.slot, "slot")),
  ));
}

/**
 * Player-facing owner lookup. This route deliberately has no deployment bearer auth and is inert
 * unless a credential verifier is injected; admin transfer endpoints remain a separate surface.
 */
export function installRoomOwnerResolutionRoute(input: {
  app: Express;
  coordinator?: RoomHandoffCoordinator;
  enabled?: boolean;
  verifyResumeCredential?: (gameId: string, credential: string) => Promise<string | undefined>;
}): void {
  input.app.post("/room/resolve-owner", async (request, response) => {
    if (input.enabled !== true || !input.coordinator || !input.verifyResumeCredential) {
      response.sendStatus(404);
      return;
    }
    const value = isRecord(request.body) ? request.body : {};
    if (
      typeof value.gameId !== "string" ||
      typeof value.resumeCredential !== "string" ||
      (value.minimumOwnerEpoch !== undefined &&
        (typeof value.minimumOwnerEpoch !== "number" || !Number.isSafeInteger(value.minimumOwnerEpoch) || value.minimumOwnerEpoch < 0))
    ) {
      response.status(400).json({ error: "ROOM_RESUME_REQUEST_INVALID" });
      return;
    }
    try {
      const participantId = await input.verifyResumeCredential(value.gameId, value.resumeCredential);
      if (!participantId) {
        response.status(401).json({ error: "ROOM_RESUME_CREDENTIAL_INVALID" });
        return;
      }
      const resolution = await input.coordinator.resolveOwner({
        gameId: value.gameId,
        participantId,
        ...(value.minimumOwnerEpoch === undefined ? {} : { minimumOwnerEpoch: value.minimumOwnerEpoch }),
      });
      response.json({
        gameId: resolution.gameId,
        slot: resolution.owner.generationId,
        processId: resolution.owner.processId,
        physicalRoomId: resolution.owner.roomId,
        ownerEpoch: resolution.ownerEpoch,
        reconnectEndpoint: "/matchmake/reconnect",
      });
    } catch (error) {
      const status = error instanceof HandoffHttpError ? error.status : 503;
      const code = error instanceof HandoffHttpError ? error.code : "ROOM_OWNER_UNAVAILABLE";
      response.status(status).json({ error: code, ...(error instanceof HandoffHttpError ? error.details : {}) });
    }
  });
}

export class HandoffHttpError extends Error {
  constructor(readonly status: number, readonly code: string, readonly details?: Record<string, unknown>) {
    super(code);
  }
}

function resultError<T>(result: Extract<HandoffResult<T>, { ok: false }>): HandoffHttpError {
  return new HandoffHttpError(409, result.reason);
}

function valueOrThrow<T>(result: HandoffResult<T>): T {
  if (!result.ok) throw resultError(result);
  return result.value;
}

function assertTransferIdentity(
  transfer: RoomTransferRecord,
  input: { transferId: string; sessionId: string; expectedOwnerEpoch: number },
): void {
  if (
    transfer.transferId !== input.transferId ||
    transfer.sessionId !== input.sessionId ||
    transfer.fromOwnerEpoch !== input.expectedOwnerEpoch
  )
    throw new HandoffHttpError(409, "transfer_identity_mismatch");
}

function assertSourceTransfer(transfer: RoomTransferRecord, generationId: string): void {
  if (transfer.from.generationId !== generationId) throw new HandoffHttpError(409, "wrong_source_generation");
}

function isAtOrAfterOwnerSwitch(status: RoomTransferRecord["status"]): boolean {
  return status === "owner_switched" || status === "destination_active" || status === "completed";
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new HandoffHttpError(400, `invalid_${name}`);
  return value;
}

function requiredPathId(value: string | undefined, name: string): string {
  return requiredString(value, name);
}

function requiredInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new HandoffHttpError(400, `invalid_${name}`);
  return value;
}

function assertEpoch(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new HandoffHttpError(400, "invalid_owner_epoch");
}

function assertId(value: string, name: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(value)) throw new HandoffHttpError(400, `invalid_${name}`);
}

function assertGeneration(value: string): void {
  if (!/^(?:blue|green|legacy|g-[a-f0-9]{12})$/.test(value)) throw new HandoffHttpError(400, "invalid_generation");
}

function safeReasonCode(value: string | undefined): string | undefined {
  return value && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
