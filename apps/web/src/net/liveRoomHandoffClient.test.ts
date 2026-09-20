// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  createHandoffCommandQueue,
  CurrentOwnerResolutionError,
  reconnectWithCurrentOwner,
  supportsLiveRoomHandoff,
  type HandoffCommandQueue,
  type LogicalGameSessionIdentity,
  type OwnerResolutionRequest,
  type SessionOwner,
} from "./liveRoomHandoffClient";
import { loadReconnectSession, saveReconnectSession, type ReconnectSession } from "./reconnectSession";
import { parseDeploymentManifest } from "./deployment";

const storage = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  removeItem: (key: string) => sessionStorage.removeItem(key),
};

const logicalSession: LogicalGameSessionIdentity = { gameId: "game-7", ownerEpoch: 4 };
const oldOwner: SessionOwner = {
  slot: "blue",
  processId: "api-blue-1",
  physicalRoomId: "room-blue",
  ownerEpoch: 4,
  reconnectEndpoint: "/matchmake/reconnect",
};
const currentOwner: SessionOwner = {
  slot: "green",
  processId: "api-green-1",
  physicalRoomId: "room-green",
  ownerEpoch: 5,
  reconnectEndpoint: "/matchmake/reconnect",
};

function reconnectSession(): ReconnectSession {
  return {
    reconnectionToken: "secret-resume-token",
    roomId: oldOwner.physicalRoomId,
    slot: oldOwner.slot,
    savedAt: Date.now(),
    logicalSession,
  };
}

function queue(idFactory: () => string): HandoffCommandQueue {
  return createHandoffCommandQueue({ storage, idFactory, tabIdFactory: () => "tab-1" });
}

describe("live room handoff client foundation", () => {
  it("keeps logical game identity across reload so a missed migration notice resolves the current owner", async () => {
    sessionStorage.clear();
    saveReconnectSession(reconnectSession());
    const restored = loadReconnectSession();
    expect(restored?.logicalSession).toEqual(logicalSession);

    const resolveOwner = vi.fn(async ({ gameId }: OwnerResolutionRequest) => {
      expect(gameId).toBe("game-7");
      return currentOwner;
    });
    const connect = vi.fn(async ({ owner }: { owner: SessionOwner }) => ({ roomId: owner.physicalRoomId }));
    const legacyConnect = vi.fn();

    await expect(
      reconnectWithCurrentOwner({
        session: restored!,
        handoffEnabled: true,
        resolveOwner,
        connectAtOwner: connect,
        reconnectLegacy: legacyConnect,
        pause: async () => {},
      }),
    ).resolves.toEqual({ room: { roomId: "room-green" }, owner: currentOwner });

    expect(connect).toHaveBeenCalledWith({
      reconnectionToken: "secret-resume-token",
      owner: currentOwner,
    });
    expect(resolveOwner).toHaveBeenCalledWith({ gameId: "game-7", minimumOwnerEpoch: 4 });
    expect(legacyConnect).not.toHaveBeenCalled();
    expect(JSON.stringify(await resolveOwner.mock.results[0]!.value)).not.toContain("secret-resume-token");
  });

  it("re-resolves ownership after a failed reconnect and rejects stale owner epochs", async () => {
    const resolveOwner = vi
      .fn(async (_request: OwnerResolutionRequest) => oldOwner)
      .mockResolvedValueOnce({ ...oldOwner, ownerEpoch: 3 })
      .mockResolvedValueOnce(oldOwner)
      .mockResolvedValueOnce(currentOwner);
    const connect = vi.fn(async ({ owner }: { reconnectionToken: string; owner: SessionOwner }) => {
      if (owner.slot === "blue") throw new Error("source is migrating");
      return { roomId: owner.physicalRoomId };
    });

    await expect(
      reconnectWithCurrentOwner({
        session: reconnectSession(),
        handoffEnabled: true,
        resolveOwner,
        connectAtOwner: connect,
        reconnectLegacy: vi.fn(),
        maxAttempts: 3,
        pause: async () => {},
      }),
    ).resolves.toMatchObject({ room: { roomId: "room-green" }, owner: currentOwner });

    expect(resolveOwner).toHaveBeenCalledTimes(3);
    expect(resolveOwner).toHaveBeenNthCalledWith(1, { gameId: "game-7", minimumOwnerEpoch: 4 });
    expect(resolveOwner).toHaveBeenNthCalledWith(2, { gameId: "game-7", minimumOwnerEpoch: 4 });
    expect(resolveOwner).toHaveBeenNthCalledWith(3, { gameId: "game-7", minimumOwnerEpoch: 4 });
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenCalledWith({ reconnectionToken: "secret-resume-token", owner: currentOwner });
  });

  it("raises the minimum epoch from a stale-owner response before resolving again", async () => {
    const stale = new CurrentOwnerResolutionError(409, "ROOM_OWNER_EPOCH_STALE", 5);
    const resolveOwner = vi
      .fn()
      .mockRejectedValueOnce(stale)
      .mockResolvedValueOnce({
        ...currentOwner,
        ownerEpoch: 5,
      });
    const connect = vi.fn(async () => "connected");

    await expect(
      reconnectWithCurrentOwner({
        session: reconnectSession(),
        handoffEnabled: true,
        resolveOwner,
        connectAtOwner: connect,
        reconnectLegacy: vi.fn(),
        maxAttempts: 2,
        pause: async () => {},
      }),
    ).resolves.toMatchObject({ room: "connected", owner: { ownerEpoch: 5 } });

    expect(resolveOwner).toHaveBeenNthCalledWith(1, { gameId: "game-7", minimumOwnerEpoch: 4 });
    expect(resolveOwner).toHaveBeenNthCalledWith(2, { gameId: "game-7", minimumOwnerEpoch: 5 });
  });

  it("preserves the current reconnect path when handoff capability is absent", async () => {
    const resolver = vi.fn();
    const connect = vi.fn();
    const legacyConnect = vi.fn(async () => "legacy-room");

    await expect(
      reconnectWithCurrentOwner({
        session: reconnectSession(),
        handoffEnabled: false,
        resolveOwner: resolver,
        connectAtOwner: connect,
        reconnectLegacy: legacyConnect,
      }),
    ).resolves.toEqual({ room: "legacy-room" });

    expect(resolver).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it("keeps the command ID and sequence unchanged when the same queued command is retried", () => {
    sessionStorage.clear();
    const firstQueue = queue(() => "command-1");
    const original = firstQueue.enqueue({
      gameId: "game-7",
      ownerEpoch: 4,
      intent: { type: "ready" },
    });

    expect(firstQueue.commandsToSend("game-7")).toEqual([original]);
    expect(firstQueue.commandsToSend("game-7")).toEqual([original]);

    const afterReload = queue(() => "unused-command-id");
    expect(afterReload.commandsToSend("game-7")).toEqual([original]);
    expect(afterReload.reconcile("game-7", [{ commandId: original.commandId, status: "received" }])).toEqual({
      resend: [],
      awaitingApplication: [original],
    });
    expect(afterReload.reconcile("game-7", [])).toEqual({
      resend: [original],
      awaitingApplication: [],
    });
    expect(sessionStorage.getItem("aegis:liveRoomCommands")).not.toContain("secret-resume-token");
  });

  it("keeps a stable per-tab identity and advances its sequence after reload", () => {
    sessionStorage.clear();
    const first = queue(() => "command-1");
    const firstCommand = first.enqueue({ gameId: "game-7", ownerEpoch: 4, intent: { type: "ready" } });
    first.acknowledge("game-7", firstCommand.commandId);

    const afterReload = queue(() => "command-2");
    const secondCommand = afterReload.enqueue({ gameId: "game-7", ownerEpoch: 5, intent: { type: "endPhase" } });

    expect(secondCommand).toMatchObject({ tabId: "tab-1", tabSequence: 2, commandId: "command-2" });
    expect(secondCommand.ownerEpoch).toBe(5);
  });

  it("rebases only pending command epochs while retaining command IDs and sequences", () => {
    sessionStorage.clear();
    let nextId = 0;
    const commands = queue(() => `command-${++nextId}`);
    const original = commands.enqueue({ gameId: "game-7", ownerEpoch: 4, intent: { type: "ready" } });
    commands.reconcile("game-7", [{ commandId: original.commandId, status: "received" }]);
    const pending = commands.enqueue({ gameId: "game-7", ownerEpoch: 4, intent: { type: "endPhase" } });

    expect(commands.rebasePendingOwnerEpoch("game-7", 5)).toEqual([{ ...pending, ownerEpoch: 5 }]);
    expect(commands.commandsToSend("game-7")).toEqual([{ ...pending, ownerEpoch: 5 }]);
    expect(
      commands.reconcile("game-7", [{ commandId: original.commandId, status: "received" }]).awaitingApplication,
    ).toEqual([original]);
  });

  it("parses handoff as an explicit opt-in deployment capability", () => {
    const legacy = parseDeploymentManifest({
      version: 1,
      active: { slot: "blue", revision: "old" },
      draining: [],
    });
    const enabled = parseDeploymentManifest({
      version: 1,
      capabilities: { liveRoomHandoff: true },
      active: { slot: "green", revision: "new" },
      draining: [],
    });

    expect(supportsLiveRoomHandoff(legacy)).toBe(false);
    expect(supportsLiveRoomHandoff(enabled)).toBe(true);
    expect(
      supportsLiveRoomHandoff(
        parseDeploymentManifest({
          version: 1,
          capabilities: { liveRoomHandoff: false },
          active: { slot: "green", revision: "new" },
          draining: [],
        }),
      ),
    ).toBe(false);
  });
});
