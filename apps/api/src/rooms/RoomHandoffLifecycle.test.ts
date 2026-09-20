import { describe, expect, it } from "vitest";
import { GameState, Phase, PlayerState } from "@aegis/shared";
import type {
  RoomCheckpointRecord,
  RoomSessionRecord,
  RoomTransferRecord,
} from "../db/roomHandoff/RoomHandoffStore.js";
import { exportStoppedMainBoundary } from "./handoff/experiment.js";
import { RoomHandoffLifecycle, loadPreparedMainCheckpoint, roomHandoffServerEnabled } from "./RoomHandoffLifecycle.js";

describe("RoomHandoffLifecycle", () => {
  it("keeps the room-control flag opt-in and disabled in production", () => {
    expect(roomHandoffServerEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(roomHandoffServerEnabled({ NODE_ENV: "test", AEGIS_ROOM_HANDOFF_SERVER: "1" })).toBe(false);
    expect(
      roomHandoffServerEnabled({
        NODE_ENV: "test",
        AEGIS_ROOM_HANDOFF_SERVER: "1",
        AEGIS_ROOM_HANDOFF_EXPERIMENT: "1",
      }),
    ).toBe(true);
    expect(
      roomHandoffServerEnabled({
        NODE_ENV: "production",
        AEGIS_ROOM_HANDOFF_SERVER: "1",
        AEGIS_ROOM_HANDOFF_EXPERIMENT: "1",
      }),
    ).toBe(false);
  });

  it("holds prepared and frozen rooms inert and rejects stale epochs", () => {
    const prepared = new RoomHandoffLifecycle({ enabled: true, ownerEpoch: 2, mode: "prepared" });
    expect(prepared.acceptsAuthority(2)).toBe(false);
    expect(prepared.activate(1)).toBe(false);
    expect(prepared.activate(2)).toBe(true);
    expect(prepared.acceptsAuthority(2)).toBe(true);
    expect(prepared.freeze(2)).toBe(true);
    expect(prepared.acceptsAuthority(2)).toBe(false);
    expect(prepared.unfreeze(1)).toBe(false);
    expect(prepared.unfreeze(2)).toBe(true);
    expect(prepared.acceptsAuthority(2)).toBe(true);
    expect(prepared.freeze(2)).toBe(true);
    expect(prepared.migrate(2, 4)).toBe(false);
    expect(prepared.migrate(2, 3)).toBe(true);
    expect(prepared.acceptsAuthority(2)).toBe(false);
    expect(prepared.ownerEpoch).toBe(3);
  });

  it("loads only a valid checkpoint already owned by this prepared destination", async () => {
    const state = mainBoundary("logical-room-1");
    const snapshot = exportStoppedMainBoundary(state);
    const session = sessionRecord({ sessionId: "logical-room-1", roomId: "room-destination", ownerEpoch: 2 });
    const checkpoint = checkpointRecord("logical-room-1", snapshot);
    const transfer = transferRecord("logical-room-1", "room-destination", checkpoint.checkpointId);
    const store = {
      getSession: async () => session,
      getCheckpoint: async () => checkpoint,
      getTransfer: async () => transfer,
    };

    const restored = await loadPreparedMainCheckpoint(store, {
      sessionId: "logical-room-1",
      transferId: "transfer-1",
      expectedOwnerEpoch: 2,
      expectedRoomId: "room-destination",
      expectedExecutionVersion: "engine-v1",
      expectedRulesVersion: "rules-v1",
      expectedSourceRevision: "source-v1",
    });
    expect(restored?.state.matchId).toBe("logical-room-1");
    expect(restored?.state).not.toBe(state);

    expect(
      await loadPreparedMainCheckpoint(store, {
        sessionId: "logical-room-1",
        transferId: "transfer-1",
        expectedOwnerEpoch: 1,
        expectedRoomId: "room-destination",
      }),
    ).toBeUndefined();
    expect(
      await loadPreparedMainCheckpoint(store, {
        sessionId: "logical-room-1",
        transferId: "transfer-1",
        expectedOwnerEpoch: 2,
        expectedRoomId: "room-source",
      }),
    ).toBeUndefined();
    expect(
      await loadPreparedMainCheckpoint(store, {
        sessionId: "logical-room-1",
        transferId: "transfer-1",
        expectedOwnerEpoch: 2,
        expectedRoomId: "room-destination",
        expectedExecutionVersion: "engine-v0",
      }),
    ).toBeUndefined();
  });
});

function mainBoundary(matchId: string): GameState {
  const state = new GameState();
  state.matchId = matchId;
  state.phase = Phase.Main;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `source-${seat}`;
    state.players[seat] = player;
  }
  return state;
}

function sessionRecord(input: { sessionId: string; roomId: string; ownerEpoch: number }): RoomSessionRecord {
  return {
    sessionId: input.sessionId,
    mode: "casual",
    status: "active",
    participants: [
      { seat: 0, kind: "account", principalId: "account-0" },
      { seat: 1, kind: "account", principalId: "account-1" },
    ],
    tournamentMatchId: null,
    tournamentGameId: null,
    owner: { generationId: "green", processId: "server-2", roomId: input.roomId },
    ownerEpoch: input.ownerEpoch,
    checkpointVersion: 1,
    nextCommandSequence: 1,
    lastCompletedCommandSequence: 0,
    activeTransferId: "transfer-1",
    createdAt: 1,
    updatedAt: 2,
    completedAt: null,
    retentionUntil: null,
  };
}

function checkpointRecord(
  sessionId: string,
  snapshot: ReturnType<typeof exportStoppedMainBoundary>,
): RoomCheckpointRecord {
  return {
    sessionId,
    checkpointId: "checkpoint-1",
    checkpointVersion: 1,
    snapshotSchemaVersion: snapshot.snapshotVersion,
    executionVersion: "engine-v1",
    rulesVersion: "rules-v1",
    sourceRevision: "source-v1",
    commandSequence: 0,
    checksum: snapshot.payloadSha256,
    snapshot: snapshot as unknown as RoomCheckpointRecord["snapshot"],
    createdAt: 2,
  };
}

function transferRecord(sessionId: string, targetRoomId: string, checkpointId: string): RoomTransferRecord {
  return {
    transferId: "transfer-1",
    sessionId,
    from: { generationId: "blue", processId: "server-1", roomId: "room-source" },
    to: { generationId: "green", processId: "server-2", roomId: targetRoomId },
    fromOwnerEpoch: 1,
    toOwnerEpoch: 2,
    status: "owner_switched",
    checkpointId,
    failureCode: null,
    startedAt: 1,
    updatedAt: 2,
    committedAt: 2,
    completedAt: null,
  };
}
