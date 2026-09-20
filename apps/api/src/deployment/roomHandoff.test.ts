import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { RoomHandoffStore, type RoomHandoffStore as RoomHandoffStoreType } from "../db/roomHandoff/RoomHandoffStore.js";
import { RoomHandoffCoordinator, type RoomHandoffRoomPort } from "./roomHandoff.js";

const SOURCE = { generationId: "g-0123456789ab", processId: "source-process", roomId: "source-room" };
const DESTINATION = { generationId: "g-abcdef012345", processId: "target-process", roomId: "target-room" };
const TRANSFER_ID = "transfer-12345678";
const SESSION_ID = "session-12345678";
const AUTHORIZATION_SECRET = "test-only-secret-with-32-bytes-minimum";

describe("RoomHandoffCoordinator", () => {
  let pool: Pool;
  let store: RoomHandoffStoreType;
  let ports: RoomHandoffRoomPort;
  let sourceFrozen: boolean;
  let destinationPrepared: boolean;
  let destinationActive: boolean;
  let sourceDisposed: boolean;
  let destinationDiscarded: boolean;
  let now: number;
  let coordinator: RoomHandoffCoordinator;
  let destinationCoordinator: RoomHandoffCoordinator;
  let destinationInspectSource: RoomHandoffRoomPort["inspectSource"];

  beforeEach(async () => {
    pool = createMemoryPool();
    store = new RoomHandoffStore(pool);
    now = 10;
    sourceFrozen = false;
    destinationPrepared = false;
    destinationActive = false;
    sourceDisposed = false;
    destinationDiscarded = false;
    await store.createSession({
      sessionId: SESSION_ID,
      mode: "casual",
      participants: [
        { seat: 0, kind: "account", principalId: "account-0" },
        { seat: 1, kind: "account", principalId: "account-1" },
      ],
      owner: SOURCE,
      now,
    });
    ports = {
      inspectSource: vi.fn(async () => ({ eligible: true })),
      reserveDestination: vi.fn(async () => DESTINATION),
      freezeSource: vi.fn(async () => {
        sourceFrozen = true;
        return true;
      }),
      saveSourceCheckpoint: vi.fn(async ({ commandSequence }) => {
        const result = await store.saveCheckpoint({
          sessionId: SESSION_ID,
          ownerEpoch: 1,
          checkpointId: "checkpoint-12345678",
          snapshotSchemaVersion: 1,
          executionVersion: "engine-v1",
          rulesVersion: "rules-v1",
          sourceRevision: "source-v1",
          commandSequence,
          checksum: "sha256:fixture",
          snapshot: { fixture: "private" },
          now: ++now,
        });
        return result.ok;
      }),
      validateDestination: vi.fn(async () => {
        destinationPrepared = true;
        return true;
      }),
      activateDestination: vi.fn(async () => {
        destinationActive = true;
        return true;
      }),
      disposeSource: vi.fn(async () => {
        sourceDisposed = true;
        return true;
      }),
      unfreezeSource: vi.fn(async () => {
        sourceFrozen = false;
        return true;
      }),
      discardDestination: vi.fn(async () => {
        destinationDiscarded = true;
        return true;
      }),
      authoritativePendingTasks: vi.fn(async () => 0),
    };
    destinationInspectSource = vi.fn(async () => ({ eligible: false, reasonCode: "cross_slot_call_forbidden" }));
    coordinator = new RoomHandoffCoordinator({
      generationId: SOURCE.generationId,
      processId: SOURCE.processId,
      store,
      rooms: ports,
      authorizationSecret: AUTHORIZATION_SECRET,
      now: () => ++now,
    });
    destinationCoordinator = new RoomHandoffCoordinator({
      generationId: DESTINATION.generationId,
      processId: DESTINATION.processId,
      store,
      rooms: { ...ports, inspectSource: destinationInspectSource },
      authorizationSecret: AUTHORIZATION_SECRET,
      now: () => ++now,
    });
  });

  afterEach(async () => pool.end());

  it("drives a casual session through the exact durable transfer phases and fences old ownership", async () => {
    const compatibility = await coordinator.checkCompatibility({
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    });
    expect(compatibility).toMatchObject({ compatible: true, rooms: [{ sessionId: SESSION_ID, compatible: true }] });

    const sourceAuthorization = await coordinator.authorizeDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 1,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    });
    expect(destinationInspectSource).not.toHaveBeenCalled();
    const reserved = await destinationCoordinator.reserveDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 1,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
      sourceAuthorization: sourceAuthorization.sourceAuthorization,
    });
    expect(reserved.transfer.status).toBe("preparing");

    expect((await coordinator.prepareSource({
      transferId: TRANSFER_ID,
      sourceGenerationId: SOURCE.generationId,
      executionVersion: "engine-v1",
      rulesVersion: "rules-v1",
      sourceRevision: "source-v1",
    })).status).toBe("snapshot_saved");
    expect((await destinationCoordinator.validateDestination({
      transferId: TRANSFER_ID,
      destinationGenerationId: DESTINATION.generationId,
      executionVersion: "engine-v1",
      rulesVersion: "rules-v1",
      sourceRevision: "source-v1",
    })).status).toBe("destination_validated");

    const claimed = await coordinator.claimOwner({ transferId: TRANSFER_ID, sourceGenerationId: SOURCE.generationId });
    expect(claimed).toMatchObject({ owner: DESTINATION, ownerEpoch: 2 });
    expect((await coordinator.reconcile(TRANSFER_ID)).transfer.status).toBe("owner_switched");
    expect((await store.admitCommand({
      sessionId: SESSION_ID,
      commandId: "late-command",
      participantId: "account-0",
      seat: 0,
      ownerEpoch: 1,
      payload: { intent: "endTurn" },
      now: ++now,
    })).ok).toBe(false);

    expect((await destinationCoordinator.activateAndComplete({
      transferId: TRANSFER_ID,
      destinationGenerationId: DESTINATION.generationId,
    })).status).toBe("completed");
    expect((await coordinator.disposeOldOwner({
      transferId: TRANSFER_ID,
      sourceGenerationId: SOURCE.generationId,
    })).status).toBe("completed");
    expect({ sourceFrozen, destinationPrepared, destinationActive, sourceDisposed }).toEqual({
      sourceFrozen: true,
      destinationPrepared: true,
      destinationActive: true,
      sourceDisposed: true,
    });
  });

  it("aborts only before owner switch and restores source authority", async () => {
    const sourceAuthorization = await coordinator.authorizeDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 1,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    });
    await destinationCoordinator.reserveDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 1,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
      sourceAuthorization: sourceAuthorization.sourceAuthorization,
    });
    await coordinator.prepareSource({
      transferId: TRANSFER_ID,
      sourceGenerationId: SOURCE.generationId,
      executionVersion: "engine-v1",
      rulesVersion: "rules-v1",
      sourceRevision: "source-v1",
    });
    const aborted = await coordinator.abortTransfer(TRANSFER_ID, SOURCE.generationId);
    expect(aborted.status).toBe("aborted");
    expect(await destinationCoordinator.discardAbortedDestination({
      transferId: TRANSFER_ID,
      destinationGenerationId: DESTINATION.generationId,
    })).toMatchObject({ status: "aborted" });
    expect({ sourceFrozen, destinationDiscarded }).toEqual({ sourceFrozen: false, destinationDiscarded: true });
    expect(await coordinator.abortTransfer(TRANSFER_ID, SOURCE.generationId)).toMatchObject({ status: "aborted" });
  });

  it("refuses an abort after an owner-switch response is lost", async () => {
    const sourceAuthorization = await coordinator.authorizeDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 1,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    });
    await destinationCoordinator.reserveDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 1,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
      sourceAuthorization: sourceAuthorization.sourceAuthorization,
    });
    await coordinator.prepareSource({
      transferId: TRANSFER_ID,
      sourceGenerationId: SOURCE.generationId,
      executionVersion: "engine-v1",
      rulesVersion: "rules-v1",
      sourceRevision: "source-v1",
    });
    await destinationCoordinator.validateDestination({
      transferId: TRANSFER_ID,
      destinationGenerationId: DESTINATION.generationId,
      executionVersion: "engine-v1",
      rulesVersion: "rules-v1",
      sourceRevision: "source-v1",
    });
    await coordinator.claimOwner({ transferId: TRANSFER_ID, sourceGenerationId: SOURCE.generationId });

    await expect(coordinator.abortTransfer(TRANSFER_ID, SOURCE.generationId)).rejects.toMatchObject({
      code: "owner_already_switched",
      status: 409,
    });
    expect(await coordinator.reconcile(TRANSFER_ID)).toMatchObject({ owner: DESTINATION, ownerEpoch: 2 });
  });

  it("fails closed for unsupported rooms, stale epochs, or unverifiable cleanup", async () => {
    vi.mocked(ports.inspectSource).mockResolvedValue({ eligible: false, reasonCode: "pending_combat" });
    const compatibility = await coordinator.checkCompatibility({
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    });
    expect(compatibility).toMatchObject({ compatible: false, rooms: [{ reasonCode: "pending_combat" }] });

    await expect(destinationCoordinator.reserveDestination({
      transferId: TRANSFER_ID,
      sessionId: SESSION_ID,
      expectedOwnerEpoch: 2,
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    })).rejects.toMatchObject({ code: "stale_source_owner" });

    vi.mocked(ports.authoritativePendingTasks!).mockResolvedValue(undefined);
    await expect(coordinator.cleanupSafety(SOURCE.generationId)).resolves.toMatchObject({
      ownershipVerified: false,
      pendingTasks: null,
    });
  });

  it("uses the database generation/process/room identity rather than slot aliases", async () => {
    const report = await coordinator.checkCompatibility({
      sourceGenerationId: SOURCE.generationId,
      destinationGenerationId: DESTINATION.generationId,
    });
    expect(report.rooms[0]).toMatchObject({ roomId: SOURCE.roomId, sessionId: SESSION_ID, ownerEpoch: 1 });
    expect(report.rooms[0]).not.toHaveProperty("generationId");
  });
});
