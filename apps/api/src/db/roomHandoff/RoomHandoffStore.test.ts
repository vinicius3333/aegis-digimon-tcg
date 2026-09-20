import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { RoomHandoffStore, type NewRoomCommand } from "./RoomHandoffStore.js";

const SOURCE = { generationId: "g-blue", processId: "p1", roomId: "room-1" };
const TARGET = { generationId: "g-green", processId: "p2", roomId: "room-9" };
const PARTICIPANTS = [
  { seat: 0 as const, kind: "account" as const, principalId: "account-1" },
  { seat: 1 as const, kind: "bot" as const, principalId: "bot-participant-2" },
];

async function createDestinationValidatedTransfer(
  store: RoomHandoffStore,
  { sessionId = "logical-room-failure", transferId = "transfer-failure" } = {},
) {
  await store.createSession({
    sessionId,
    mode: "ranked",
    participants: PARTICIPANTS,
    owner: SOURCE,
    now: 10,
  });
  await store.saveCheckpoint({
    sessionId,
    ownerEpoch: 1,
    checkpointId: "checkpoint-failure",
    snapshotSchemaVersion: 1,
    executionVersion: "engine-a",
    rulesVersion: "catalog-a",
    sourceRevision: "revision-a",
    commandSequence: 0,
    checksum: "sha256:failure",
    snapshot: { board: "confirmed" },
    now: 11,
  });
  await store.beginTransfer({ transferId, sessionId, ownerEpoch: 1, target: TARGET, now: 12 });
  await store.advanceTransfer({ transferId, ownerEpoch: 1, expected: "preparing", next: "frozen", now: 13 });
  await store.advanceTransfer({
    transferId,
    ownerEpoch: 1,
    expected: "frozen",
    next: "snapshot_saved",
    checkpointId: "checkpoint-failure",
    now: 14,
  });
  await store.advanceTransfer({
    transferId,
    ownerEpoch: 1,
    expected: "snapshot_saved",
    next: "destination_validated",
    checkpointId: "checkpoint-failure",
    now: 15,
  });
  return { sessionId, transferId };
}

describe("RoomHandoffStore", () => {
  let pool: Pool;
  let store: RoomHandoffStore;

  beforeEach(() => {
    pool = createMemoryPool();
    store = new RoomHandoffStore(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("rotates resume credentials per account and rejects wrong-game and expired credentials", async () => {
    await store.createSession({
      sessionId: "credential-game-1",
      mode: "casual",
      participants: [
        { seat: 0, kind: "account", principalId: "account-1" },
        { seat: 1, kind: "account", principalId: "account-2" },
      ],
      owner: SOURCE,
      now: 100,
    });
    const hash = (credential: string) => createHash("sha256").update(credential).digest("hex");

    expect(
      await store.rotateResumeCredential({
        sessionId: "credential-game-1",
        participantId: "bot-not-seated",
        credentialHash: hash("not-a-player"),
        now: 110,
        expiresAt: 1_000,
      }),
    ).toBe(false);
    expect(
      await store.rotateResumeCredential({
        sessionId: "credential-game-1",
        participantId: "account-1",
        credentialHash: hash("resume-old"),
        now: 110,
        expiresAt: 200,
      }),
    ).toBe(true);
    expect(
      await store.verifyResumeCredential({
        sessionId: "credential-game-1",
        credentialHash: hash("resume-old"),
        now: 199,
      }),
    ).toBe("account-1");
    expect(
      await store.verifyResumeCredential({ sessionId: "another-game", credentialHash: hash("resume-old"), now: 199 }),
    ).toBeUndefined();
    expect(
      await store.verifyResumeCredential({
        sessionId: "credential-game-1",
        credentialHash: hash("resume-old"),
        now: 200,
      }),
    ).toBeUndefined();

    expect(
      await store.rotateResumeCredential({
        sessionId: "credential-game-1",
        participantId: "account-1",
        credentialHash: hash("resume-new"),
        now: 201,
        expiresAt: 500,
      }),
    ).toBe(true);
    expect(
      await store.verifyResumeCredential({
        sessionId: "credential-game-1",
        credentialHash: hash("resume-old"),
        now: 202,
      }),
    ).toBeUndefined();
    expect(
      await store.verifyResumeCredential({
        sessionId: "credential-game-1",
        credentialHash: hash("resume-new"),
        now: 202,
      }),
    ).toBe("account-1");
  });

  it("redeems a destination reservation once and binds it to generation, epoch, and expiry", async () => {
    const hash = createHash("sha256").update("one-time-reservation").digest("hex");
    const reservation = {
      transferId: "transfer-reservation-1",
      sessionId: "logical-room-reservation-1",
      sourceOwnerEpoch: 4,
      destinationGenerationId: "g-green",
      ownerEpoch: 5,
      tokenHash: hash,
      now: 100,
      expiresAt: 220,
    };
    await store.createRoomHandoffReservation(reservation);
    expect(
      await store.redeemRoomHandoffReservation({
        tokenHash: hash,
        destinationGenerationId: "g-blue",
        ownerEpoch: 5,
        roomId: "forged-room",
        processId: "p2",
        now: 120,
      }),
    ).toBeUndefined();
    expect(
      await store.redeemRoomHandoffReservation({
        tokenHash: hash,
        destinationGenerationId: "g-green",
        ownerEpoch: 4,
        roomId: "stale-room",
        processId: "p2",
        now: 120,
      }),
    ).toBeUndefined();
    const redeemed = await store.redeemRoomHandoffReservation({
      tokenHash: hash,
      destinationGenerationId: "g-green",
      ownerEpoch: 5,
      roomId: "room-destination",
      processId: "p2",
      now: 120,
    });
    expect(redeemed).toMatchObject({
      transferId: "transfer-reservation-1",
      sessionId: "logical-room-reservation-1",
      sourceOwnerEpoch: 4,
      destinationGenerationId: "g-green",
      ownerEpoch: 5,
      roomId: "room-destination",
      processId: "p2",
    });
    expect(
      await store.redeemRoomHandoffReservation({
        tokenHash: hash,
        destinationGenerationId: "g-green",
        ownerEpoch: 5,
        roomId: "replay-room",
        processId: "p2",
        now: 121,
      }),
    ).toBeUndefined();
    expect(await store.removeConsumedRoomHandoffReservation("transfer-reservation-1")).toBe(true);
    expect(await store.getRoomHandoffReservation("transfer-reservation-1")).toBeUndefined();

    const expiredHash = createHash("sha256").update("expired-reservation").digest("hex");
    await store.createRoomHandoffReservation({
      ...reservation,
      transferId: "transfer-expired",
      tokenHash: expiredHash,
    });
    expect(
      await store.redeemRoomHandoffReservation({
        tokenHash: expiredHash,
        destinationGenerationId: "g-green",
        ownerEpoch: 5,
        roomId: "too-late-room",
        processId: "p2",
        now: 220,
      }),
    ).toBeUndefined();
    expect(await store.cancelRoomHandoffReservation({ transferId: "transfer-expired", tokenHash: expiredHash })).toBe(
      true,
    );
  });

  it("rotates an unconsumed retry token but never overwrites a consumed reservation", async () => {
    const digest = (value: string) => createHash("sha256").update(value).digest("hex");
    const reservation = {
      transferId: "transfer-reservation-retry",
      sessionId: "logical-room-reservation-retry",
      sourceOwnerEpoch: 1,
      destinationGenerationId: "g-green",
      ownerEpoch: 2,
      now: 100,
      expiresAt: 220,
    };
    expect(await store.createRoomHandoffReservation({ ...reservation, tokenHash: digest("first-token") })).toBe(true);
    expect(
      await store.createRoomHandoffReservation({
        ...reservation,
        now: 110,
        expiresAt: 230,
        tokenHash: digest("retry-token"),
      }),
    ).toBe(true);
    expect(
      await store.redeemRoomHandoffReservation({
        tokenHash: digest("first-token"),
        destinationGenerationId: "g-green",
        ownerEpoch: 2,
        roomId: "wrong-room",
        processId: "p2",
        now: 120,
      }),
    ).toBeUndefined();
    expect(
      await store.redeemRoomHandoffReservation({
        tokenHash: digest("retry-token"),
        destinationGenerationId: "g-green",
        ownerEpoch: 2,
        roomId: "one-room-only",
        processId: "p2",
        now: 130,
      }),
    ).toMatchObject({ roomId: "one-room-only", transferId: "transfer-reservation-retry" });
    expect(
      await store.createRoomHandoffReservation({
        ...reservation,
        now: 140,
        expiresAt: 260,
        tokenHash: digest("late-token"),
      }),
    ).toBe(false);
  });

  it("admits a command once and returns its durable outcome for a retry", async () => {
    const session = await store.createSession({
      sessionId: "logical-room-1",
      mode: "ranked",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 100,
    });
    expect(session).toMatchObject({ ok: true, replayed: false });
    expect(
      await store.createSession({
        sessionId: "logical-room-1",
        mode: "ranked",
        participants: PARTICIPANTS,
        owner: SOURCE,
        now: 100,
      }),
    ).toMatchObject({ ok: true, replayed: true });
    const input: NewRoomCommand = {
      sessionId: "logical-room-1",
      commandId: "cmd-1",
      participantId: "account-1",
      seat: 0,
      ownerEpoch: 1,
      expectedRevision: 0,
      payload: { intent: "endTurn" },
      now: 101,
    };

    expect(await store.admitCommand({ ...input, commandId: "not-seated", participantId: "account-elsewhere" })).toEqual(
      {
        ok: false,
        reason: "participant_not_seated",
      },
    );
    const first = await store.admitCommand(input);
    const retry = await store.admitCommand({ ...input, ownerEpoch: 99, now: 102 });
    expect(first).toMatchObject({
      ok: true,
      replayed: false,
      value: { participantSequence: 1, commandSequence: 1, status: "admitted" },
    });
    expect(retry).toMatchObject({
      ok: true,
      replayed: true,
      value: { participantSequence: 1, commandSequence: 1, status: "admitted" },
    });

    const completed = await store.completeCommand({
      sessionId: "logical-room-1",
      commandId: "cmd-1",
      ownerEpoch: 1,
      status: "applied",
      result: { revision: 1 },
      now: 103,
    });
    expect(completed).toMatchObject({ ok: true, value: { status: "applied", result: { revision: 1 } } });
    expect(
      await store.completeCommand({
        sessionId: "logical-room-1",
        commandId: "cmd-1",
        ownerEpoch: 1,
        status: "applied",
        result: { revision: 1 },
        now: 104,
      }),
    ).toMatchObject({ ok: true, replayed: true });

    const nextCommand = await store.admitCommand({
      ...input,
      commandId: "cmd-from-second-tab",
      payload: { intent: "surrender" },
      now: 105,
    });
    expect(nextCommand).toMatchObject({
      ok: true,
      value: { participantSequence: 2, commandSequence: 2, status: "admitted" },
    });

    const stale = await store.admitCommand({ ...input, commandId: "cmd-stale", ownerEpoch: 99 });
    expect(stale).toEqual({ ok: false, reason: "owner_epoch_mismatch" });
  });

  it("assigns a unique durable participant sequence to commands from separate tabs", async () => {
    await store.createSession({
      sessionId: "logical-room-concurrent-tabs",
      mode: "casual",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 150,
    });
    const sharedInput = {
      sessionId: "logical-room-concurrent-tabs",
      participantId: "account-1",
      seat: 0 as const,
      ownerEpoch: 1,
      now: 151,
    };

    // AegisRoom serializes requests from concurrent sockets before admission; the
    // durable participant cursor then allocates one shared stream rather than trusting
    // each tab's local sequence (both would independently start at 1).
    const tabA = await store.admitCommand({
      ...sharedInput,
      commandId: "tab-a-command",
      payload: { intent: { type: "endPhase" } },
    });
    const tabB = await store.admitCommand({
      ...sharedInput,
      commandId: "tab-b-command",
      payload: { intent: { type: "surrender" } },
    });

    expect(tabA.ok).toBe(true);
    expect(tabB.ok).toBe(true);
    if (!tabA.ok || !tabB.ok) return;
    expect([tabA.value.participantSequence, tabB.value.participantSequence].sort()).toEqual([1, 2]);
    expect([tabA.value.commandSequence, tabB.value.commandSequence].sort()).toEqual([1, 2]);
  });

  it("commits an applied command with its recovery checkpoint and reports authoritative pending work", async () => {
    await store.createSession({
      sessionId: "logical-command-recovery",
      mode: "casual",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 100,
    });
    const admitted = await store.admitCommand({
      sessionId: "logical-command-recovery",
      commandId: "command-recover-1",
      participantId: "account-1",
      seat: 0,
      ownerEpoch: 1,
      payload: { type: "endPhase" },
      now: 101,
    });
    expect(admitted).toMatchObject({ ok: true, value: { status: "admitted", commandSequence: 1 } });
    expect(await store.getNextAdmittedCommand("logical-command-recovery")).toMatchObject({
      commandId: "command-recover-1",
      commandSequence: 1,
      status: "admitted",
    });
    expect(await store.countPendingTasks("logical-command-recovery")).toEqual({
      commands: 1,
      outbox: 0,
      transfers: 0,
      total: 1,
    });

    const completed = await store.completeCommand({
      sessionId: "logical-command-recovery",
      commandId: "command-recover-1",
      ownerEpoch: 1,
      status: "applied",
      result: { ok: true },
      now: 102,
      checkpoint: {
        checkpointId: "command-checkpoint-1",
        snapshotSchemaVersion: 1,
        executionVersion: "engine-v1",
        rulesVersion: "rules-v1",
        sourceRevision: "revision-v1",
        checksum: "sha256:after-command",
        snapshot: { board: "after-command" },
      },
    });

    expect(completed).toMatchObject({ ok: true, value: { status: "applied", commandSequence: 1 } });
    expect(await store.getNextAdmittedCommand("logical-command-recovery")).toBeUndefined();
    expect(await store.getCheckpoint("logical-command-recovery")).toMatchObject({
      checkpointId: "command-checkpoint-1",
      commandSequence: 1,
      snapshot: { board: "after-command" },
    });
    expect(await store.countPendingTasks("logical-command-recovery")).toEqual({
      commands: 0,
      outbox: 0,
      transfers: 0,
      total: 0,
    });
    expect(await store.countPendingTasks()).toMatchObject({ commands: 0, total: 0 });
  });

  it("counts pending commands, outbox effects, and transfers against each affected generation", async () => {
    await store.createSession({
      sessionId: "generation-pending-blue",
      mode: "casual",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 120,
    });
    await store.createSession({
      sessionId: "generation-pending-green",
      mode: "casual",
      participants: PARTICIPANTS,
      owner: TARGET,
      now: 120,
    });
    await store.admitCommand({
      sessionId: "generation-pending-blue",
      commandId: "generation-pending-command",
      participantId: "account-1",
      seat: 0,
      ownerEpoch: 1,
      payload: { intent: "endTurn" },
      now: 121,
    });
    await store.enqueueOutbox({
      id: "generation-pending-outbox-blue",
      effectKey: "generation-pending-blue-result",
      sessionId: "generation-pending-blue",
      ownerEpoch: 1,
      effectType: "record_match_result",
      payload: { winnerSeat: 0 },
      now: 122,
    });
    await store.enqueueOutbox({
      id: "generation-pending-outbox-green",
      effectKey: "generation-pending-green-result",
      sessionId: "generation-pending-green",
      ownerEpoch: 1,
      effectType: "record_match_result",
      payload: { winnerSeat: 1 },
      now: 122,
    });

    expect(await store.countPendingTasksByGeneration(SOURCE.generationId)).toEqual({
      commands: 1,
      outbox: 1,
      transfers: 0,
      total: 2,
    });
    expect(await store.countPendingTasksByGeneration(TARGET.generationId)).toEqual({
      commands: 0,
      outbox: 1,
      transfers: 0,
      total: 1,
    });

    await store.beginTransfer({
      transferId: "generation-pending-transfer",
      sessionId: "generation-pending-blue",
      ownerEpoch: 1,
      target: TARGET,
      now: 123,
    });
    expect(await store.countPendingTasksByGeneration(SOURCE.generationId)).toMatchObject({
      commands: 1,
      outbox: 1,
      transfers: 1,
      total: 3,
    });
    expect(await store.countPendingTasksByGeneration(TARGET.generationId)).toMatchObject({
      commands: 0,
      outbox: 1,
      transfers: 1,
      total: 2,
    });
  });

  it("replaces the checkpoint only under the current epoch and only through a completed command", async () => {
    await store.createSession({
      sessionId: "logical-room-2",
      mode: "private",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 200,
    });
    const command = await store.admitCommand({
      sessionId: "logical-room-2",
      commandId: "cmd-2",
      participantId: "account-1",
      seat: 0,
      ownerEpoch: 1,
      payload: { intent: "endTurn" },
      now: 201,
    });
    expect(command.ok).toBe(true);

    expect(
      await store.saveCheckpoint({
        sessionId: "logical-room-2",
        ownerEpoch: 1,
        checkpointId: "checkpoint-early",
        snapshotSchemaVersion: 1,
        executionVersion: "engine-a",
        rulesVersion: "catalog-a",
        sourceRevision: "revision-a",
        commandSequence: 1,
        checksum: "sha256:early",
        snapshot: { hiddenCards: ["card-secret"] },
        now: 202,
      }),
    ).toEqual({ ok: false, reason: "command_not_completed" });

    await store.completeCommand({
      sessionId: "logical-room-2",
      commandId: "cmd-2",
      ownerEpoch: 1,
      status: "applied",
      result: { revision: 1 },
      now: 203,
    });
    const checkpoint = await store.saveCheckpoint({
      sessionId: "logical-room-2",
      ownerEpoch: 1,
      checkpointId: "checkpoint-1",
      snapshotSchemaVersion: 1,
      executionVersion: "engine-a",
      rulesVersion: "catalog-a",
      sourceRevision: "revision-a",
      commandSequence: 1,
      checksum: "sha256:state-1",
      snapshot: { hiddenCards: ["card-secret"] },
      now: 204,
    });
    expect(checkpoint).toMatchObject({ ok: true, value: { checkpointVersion: 1, commandSequence: 1 } });

    expect(
      await store.saveCheckpoint({
        sessionId: "logical-room-2",
        ownerEpoch: 9,
        checkpointId: "checkpoint-stale",
        snapshotSchemaVersion: 1,
        executionVersion: "engine-a",
        rulesVersion: "catalog-a",
        sourceRevision: "revision-a",
        commandSequence: 1,
        checksum: "sha256:stale",
        snapshot: { wrong: true },
        now: 205,
      }),
    ).toEqual({ ok: false, reason: "owner_epoch_mismatch" });
    expect(await store.getCheckpoint("logical-room-2")).toMatchObject({ checkpointId: "checkpoint-1" });
    expect(
      await store.saveCheckpoint({
        sessionId: "logical-room-2",
        ownerEpoch: 1,
        checkpointId: "checkpoint-regressed",
        snapshotSchemaVersion: 1,
        executionVersion: "engine-a",
        rulesVersion: "catalog-a",
        sourceRevision: "revision-a",
        commandSequence: 0,
        checksum: "sha256:old",
        snapshot: { stale: true },
        now: 206,
      }),
    ).toEqual({ ok: false, reason: "checkpoint_regression" });
  });

  it("moves ownership once at the destination-ready barrier and fences the previous epoch", async () => {
    await store.createSession({
      sessionId: "logical-room-3",
      mode: "tournament",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 300,
    });
    const checkpoint = await store.saveCheckpoint({
      sessionId: "logical-room-3",
      ownerEpoch: 1,
      checkpointId: "checkpoint-transfer",
      snapshotSchemaVersion: 1,
      executionVersion: "engine-a",
      rulesVersion: "catalog-a",
      sourceRevision: "revision-a",
      commandSequence: 0,
      checksum: "sha256:transfer",
      snapshot: { board: "complete" },
      now: 301,
    });
    expect(checkpoint.ok).toBe(true);
    expect(
      await store.beginTransfer({
        transferId: "transfer-1",
        sessionId: "logical-room-3",
        ownerEpoch: 1,
        target: TARGET,
        now: 302,
      }),
    ).toMatchObject({ ok: true, value: { status: "preparing" } });
    expect(await store.getTransfer("transfer-1")).toMatchObject({
      transferId: "transfer-1",
      sessionId: "logical-room-3",
      fromOwnerEpoch: 1,
      toOwnerEpoch: 2,
      status: "preparing",
      to: TARGET,
    });
    expect(await store.getTransfer("missing-transfer")).toBeUndefined();
    expect(
      await store.advanceTransfer({
        transferId: "transfer-1",
        ownerEpoch: 1,
        expected: "preparing",
        next: "frozen",
        now: 303,
      }),
    ).toMatchObject({ ok: true, value: { status: "frozen" } });
    expect(
      await store.advanceTransfer({
        transferId: "transfer-1",
        ownerEpoch: 1,
        expected: "frozen",
        next: "snapshot_saved",
        checkpointId: "checkpoint-transfer",
        now: 304,
      }),
    ).toMatchObject({ ok: true, value: { status: "snapshot_saved" } });
    expect(
      await store.advanceTransfer({
        transferId: "transfer-1",
        ownerEpoch: 1,
        expected: "snapshot_saved",
        next: "destination_validated",
        checkpointId: "checkpoint-transfer",
        now: 305,
      }),
    ).toMatchObject({ ok: true, value: { status: "destination_validated" } });

    const firstClaim = await store.claimTransfer({ transferId: "transfer-1", expectedOwnerEpoch: 1, now: 306 });
    const retryClaim = await store.claimTransfer({ transferId: "transfer-1", expectedOwnerEpoch: 1, now: 307 });
    expect(firstClaim).toMatchObject({ ok: true, replayed: false, value: { ownerEpoch: 2 } });
    expect(retryClaim).toMatchObject({ ok: true, replayed: true, value: { ownerEpoch: 2 } });
    expect(await store.getSession("logical-room-3")).toMatchObject({
      owner: TARGET,
      ownerEpoch: 2,
      activeTransferId: "transfer-1",
    });
    expect(
      await store.admitCommand({
        sessionId: "logical-room-3",
        commandId: "stale-after-transfer",
        participantId: "account-1",
        seat: 0,
        ownerEpoch: 1,
        payload: { intent: "endTurn" },
        now: 307,
      }),
    ).toEqual({ ok: false, reason: "owner_epoch_mismatch" });
    expect(await store.activateTransfer({ transferId: "transfer-1", ownerEpoch: 2, now: 308 })).toMatchObject({
      ok: true,
      value: { status: "destination_active" },
    });
    expect(await store.completeTransfer({ transferId: "transfer-1", ownerEpoch: 2, now: 309 })).toMatchObject({
      ok: true,
      value: { status: "completed" },
    });
    expect(await store.getSession("logical-room-3")).toMatchObject({ activeTransferId: null, ownerEpoch: 2 });
  });

  it("deduplicates outbox effects by their durable idempotency key", async () => {
    await store.createSession({
      sessionId: "logical-room-4",
      mode: "ranked",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 400,
    });
    const event = {
      id: randomUUID(),
      effectKey: "match-result:logical-room-4",
      sessionId: "logical-room-4",
      ownerEpoch: 1,
      effectType: "record_match_result",
      payload: { winnerSeat: 0 },
      now: 401,
    } as const;
    expect(await store.enqueueOutbox(event)).toMatchObject({ ok: true, replayed: false });
    expect(await store.enqueueOutbox({ ...event, id: randomUUID(), now: 402 })).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(await store.enqueueOutbox({ ...event, id: randomUUID(), payload: { winnerSeat: 1 }, now: 403 })).toEqual({
      ok: false,
      reason: "effect_key_conflict",
    });
  });

  it("claims due outbox effects with leases and only the current claimant can deliver them", async () => {
    await store.createSession({
      sessionId: "logical-room-5",
      mode: "ranked",
      participants: PARTICIPANTS,
      owner: SOURCE,
      now: 500,
    });
    for (const index of [1, 2]) {
      await store.enqueueOutbox({
        id: `outbox-${index}`,
        effectKey: `result:${index}`,
        sessionId: "logical-room-5",
        ownerEpoch: 1,
        effectType: "record_match_result",
        payload: { index },
        now: 501,
      });
    }
    const claimed = await store.claimOutbox({ workerId: "worker-a", now: 502, leaseMs: 5_000, limit: 1 });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({ status: "claimed", claimedBy: "worker-a", attemptCount: 1 });
    expect(await store.markOutboxDelivered({ id: claimed[0]!.id, workerId: "worker-b", now: 503 })).toEqual({
      ok: false,
      reason: "outbox_claim_lost",
    });
    expect(await store.markOutboxDelivered({ id: claimed[0]!.id, workerId: "worker-a", now: 504 })).toMatchObject({
      ok: true,
      value: { status: "delivered", deliveredAt: 504 },
    });
    expect(await store.claimOutbox({ workerId: "worker-b", now: 505, leaseMs: 5_000, limit: 10 })).toHaveLength(1);
  });

  it("completes a logical session only after transfer work is finished and retains it through its deadline", async () => {
    await store.createSession({
      sessionId: "logical-room-6",
      mode: "tournament",
      participants: PARTICIPANTS,
      owner: SOURCE,
      tournamentMatchId: "match-6",
      tournamentGameId: "game-6",
      now: 600,
    });
    const transfer = await store.beginTransfer({
      transferId: "transfer-6",
      sessionId: "logical-room-6",
      ownerEpoch: 1,
      target: TARGET,
      now: 601,
    });
    expect(transfer.ok).toBe(true);
    expect(
      await store.completeSession({ sessionId: "logical-room-6", ownerEpoch: 1, now: 602, retentionUntil: 999 }),
    ).toEqual({
      ok: false,
      reason: "transfer_in_progress",
    });
    await store.abortTransfer({ transferId: "transfer-6", ownerEpoch: 1, failureCode: "fixture", now: 603 });
    expect(
      await store.completeSession({ sessionId: "logical-room-6", ownerEpoch: 1, now: 604, retentionUntil: 999 }),
    ).toMatchObject({
      ok: true,
      value: {
        status: "completed",
        completedAt: 604,
        retentionUntil: 999,
        tournamentMatchId: "match-6",
        tournamentGameId: "game-6",
      },
    });
  });

  it("reconciles a lost owner-switch response as an idempotent claim without incrementing the epoch twice", async () => {
    const { sessionId, transferId } = await createDestinationValidatedTransfer(store);
    const claim = { transferId, expectedOwnerEpoch: 1, now: 20 };

    await expect(
      (async () => {
        const committed = await store.claimTransfer(claim);
        if (committed.ok) throw new Error("simulated response loss after durable commit");
      })(),
    ).rejects.toThrow("simulated response loss");

    const replay = await store.claimTransfer({ ...claim, now: 21 });
    expect(replay).toMatchObject({
      ok: true,
      replayed: true,
      value: { owner: TARGET, ownerEpoch: 2, activeTransferId: transferId },
    });
    expect(await store.getSession(sessionId)).toMatchObject({ owner: TARGET, ownerEpoch: 2 });
  });

  it("rejects a stale destination directory and stale source epoch before ownership changes", async () => {
    const { sessionId, transferId } = await createDestinationValidatedTransfer(store);
    const duplicate = await store.beginTransfer({
      transferId,
      sessionId,
      ownerEpoch: 1,
      target: TARGET,
      now: 20,
    });
    expect(duplicate).toMatchObject({ ok: true, replayed: true });

    const staleDirectory = await store.beginTransfer({
      transferId,
      sessionId,
      ownerEpoch: 1,
      target: { ...TARGET, processId: "p2-restarted" },
      now: 21,
    });
    expect(staleDirectory).toEqual({ ok: false, reason: "transfer_state_mismatch" });

    const staleEpoch = await store.claimTransfer({ transferId, expectedOwnerEpoch: 0, now: 22 });
    expect(staleEpoch).toEqual({ ok: false, reason: "owner_epoch_mismatch" });
    expect(await store.getSession(sessionId)).toMatchObject({ owner: SOURCE, ownerEpoch: 1 });
  });

  it("allows abort before owner commit and permanently prevents a later claim", async () => {
    const { sessionId, transferId } = await createDestinationValidatedTransfer(store);
    const abort = { transferId, ownerEpoch: 1, failureCode: "operator_cancelled", now: 20 };
    expect(await store.abortTransfer(abort)).toMatchObject({ ok: true, value: { status: "aborted" } });
    expect(await store.abortTransfer({ ...abort, now: 21 })).toMatchObject({
      ok: true,
      replayed: true,
      value: { status: "aborted" },
    });

    expect(await store.claimTransfer({ transferId, expectedOwnerEpoch: 1, now: 22 })).toEqual({
      ok: false,
      reason: "transfer_state_mismatch",
    });
    expect(await store.getSession(sessionId)).toMatchObject({
      owner: SOURCE,
      ownerEpoch: 1,
      activeTransferId: null,
    });
  });
});
