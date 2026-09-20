import { describe, expect, it, vi } from "vitest";
import type { Room } from "colyseus.js";
import type { GameState } from "@aegis/shared";
import { AegisConnectionRouter, connectionSlot, roomHandoffIdentity, type ColyseusClientPort } from "./client";
import type { DeploymentManifest, DeploymentSlot } from "./deployment";
import type { ReconnectSession } from "./reconnectSession";

const OPTIONS = { displayName: "Tamer", deck: { mainDeck: [], eggDeck: [] } };

function room(roomId: string): Room<GameState> {
  return { roomId, reconnectionToken: `${roomId}:token` } as Room<GameState>;
}

function clientPort(overrides: Partial<ColyseusClientPort> = {}): ColyseusClientPort {
  const unavailable = async () => {
    throw new Error("no room");
  };
  return {
    join: unavailable,
    joinOrCreate: unavailable,
    create: unavailable,
    joinById: unavailable,
    reconnect: unavailable,
    consumeSeatReservation: unavailable,
    ...overrides,
  };
}

function router({
  manifest,
  blue,
  green,
}: {
  manifest: DeploymentManifest;
  blue: ColyseusClientPort;
  green: ColyseusClientPort;
}): AegisConnectionRouter {
  const clients: Record<string, ColyseusClientPort> = { blue, green };
  return new AegisConnectionRouter({
    loadManifest: async () => manifest,
    endpointForSlot: (slot) => ({
      http: `https://example.test/api/${slot}`,
      websocket: `wss://example.test/api/${slot}`,
    }),
    createClient: (_endpoint, slot) => clients[slot]!,
    fetcher: vi.fn(async () => new Response("{}", { status: 404 })),
  });
}

describe("room-scoped deployment affinity", () => {
  it("routes an opted-in beta match to the production beta queue", async () => {
    const betaRoom = room("beta-room");
    const greenJoin = vi.fn(async () => betaRoom);
    const client = router({
      manifest: { version: 1, active: { slot: "green", revision: "new" }, draining: [] },
      blue: clientPort(),
      green: clientPort({ joinOrCreate: greenJoin }),
    });
    await expect(client.joinOrCreate({ ...OPTIONS, betaBattleMode: true })).resolves.toBe(betaRoom);
    expect(greenJoin).toHaveBeenCalledWith("aegis_beta", expect.objectContaining({ betaBattleMode: true }));
  });
  it("rejects combining beta matchmaking with ranked play", async () => {
    const greenJoin = vi.fn(async () => room("unexpected"));
    const client = router({
      manifest: { version: 1, active: { slot: "green", revision: "new" }, draining: [] },
      blue: clientPort(),
      green: clientPort({ joinOrCreate: greenJoin }),
    });
    await expect(client.joinOrCreate({ ...OPTIONS, betaBattleMode: true, ranked: true })).rejects.toThrow(
      "cannot be ranked",
    );
    expect(greenJoin).not.toHaveBeenCalled();
  });
  it("calls the bot endpoint without rebinding the browser fetch receiver", async () => {
    const botRoom = room("bot-room");
    const fetcher = vi.fn(function (this: unknown) {
      if (this !== undefined) throw new TypeError("Illegal invocation");
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as unknown as typeof fetch;
    const client = new AegisConnectionRouter({
      loadManifest: async () => ({
        version: 1,
        active: { slot: "green", revision: "new" },
        draining: [],
      }),
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: () => clientPort({ create: async () => botRoom }),
      fetcher,
    });

    const created = await client.createBot(OPTIONS);
    await expect(client.joinWithBot(created.roomId)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/api/green/bot/join",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("creates bot matches in an isolated room instead of entering casual matchmaking", async () => {
    const botRoom = room("bot-room");
    const greenCreate = vi.fn(async () => botRoom);
    const greenJoinOrCreate = vi.fn(async () => room("casual-room"));
    const client = router({
      manifest: {
        version: 1,
        active: { slot: "green", revision: "new" },
        draining: [{ slot: "blue", revision: "old" }],
      },
      blue: clientPort(),
      green: clientPort({ create: greenCreate, joinOrCreate: greenJoinOrCreate }),
    });

    await expect(client.createBot(OPTIONS)).resolves.toBe(botRoom);
    expect(greenCreate).toHaveBeenCalledWith("aegis_bot", OPTIONS);
    expect(greenJoinOrCreate).not.toHaveBeenCalled();
    expect(connectionSlot(botRoom)).toBe("green");
  });

  it("creates beta bot matches in a beta-isolated room", async () => {
    const botRoom = room("beta-bot-room");
    const greenCreate = vi.fn(async () => botRoom);
    const client = router({
      manifest: { version: 1, active: { slot: "green", revision: "new" }, draining: [] },
      blue: clientPort(),
      green: clientPort({ create: greenCreate }),
    });

    await expect(client.createBot({ ...OPTIONS, betaBattleMode: true })).resolves.toBe(botRoom);
    expect(greenCreate).toHaveBeenCalledWith("aegis_beta_bot", expect.objectContaining({ betaBattleMode: true }));
  });

  it("refreshes the manifest when the active slot starts draining while creating a bot room", async () => {
    const manifests: DeploymentManifest[] = [
      { version: 1, active: { slot: "blue", revision: "old" }, draining: [] },
      { version: 1, active: { slot: "green", revision: "new" }, draining: [{ slot: "blue", revision: "old" }] },
    ];
    const loadManifest = vi.fn(async () => manifests.shift() ?? manifests[0]!);
    const blueCreate = vi.fn(async () => {
      throw Object.assign(new Error("server is draining"), { code: 503 });
    });
    const greenRoom = room("green-bot-room");
    const greenCreate = vi.fn(async () => greenRoom);
    const clients: Record<string, ColyseusClientPort> = {
      blue: clientPort({ create: blueCreate }),
      green: clientPort({ create: greenCreate }),
    };
    const client = new AegisConnectionRouter({
      loadManifest,
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: (_endpoint, slot) => clients[slot]!,
      fetcher: vi.fn(async () => new Response("{}", { status: 404 })),
    });

    await expect(client.createBot(OPTIONS)).resolves.toBe(greenRoom);
    expect(loadManifest).toHaveBeenCalledTimes(2);
    expect(blueCreate).toHaveBeenCalledOnce();
    expect(greenCreate).toHaveBeenCalledWith("aegis_bot", OPTIONS);
    expect(connectionSlot(greenRoom)).toBe("green");
  });

  it("fills a waiting room on the draining slot before creating on active", async () => {
    const oldRoom = room("old-room");
    const blueJoin = vi.fn(async () => oldRoom);
    const greenJoinOrCreate = vi.fn(async () => room("new-room"));
    const client = router({
      manifest: {
        version: 1,
        active: { slot: "green", revision: "new" },
        draining: [{ slot: "blue", revision: "old" }],
      },
      blue: clientPort({ join: blueJoin }),
      green: clientPort({ joinOrCreate: greenJoinOrCreate }),
    });

    await expect(client.joinOrCreate(OPTIONS)).resolves.toBe(oldRoom);
    expect(blueJoin).toHaveBeenCalledOnce();
    expect(greenJoinOrCreate).not.toHaveBeenCalled();
    expect(connectionSlot(oldRoom)).toBe("blue");
  });

  it("creates on active when no draining room can be joined", async () => {
    const newRoom = room("new-room");
    const greenJoinOrCreate = vi.fn(async () => newRoom);
    const client = router({
      manifest: {
        version: 1,
        active: { slot: "green", revision: "new" },
        draining: [{ slot: "blue", revision: "old" }],
      },
      blue: clientPort(),
      green: clientPort({ joinOrCreate: greenJoinOrCreate }),
    });

    await expect(client.joinOrCreate(OPTIONS)).resolves.toBe(newRoom);
    expect(connectionSlot(newRoom)).toBe("green");
  });

  it("reconnects through the room's original slot after active changes", async () => {
    const resumed = room("old-room");
    const blueReconnect = vi.fn(async () => resumed);
    const greenReconnect = vi.fn(async () => room("wrong-room"));
    const client = router({
      manifest: {
        version: 1,
        active: { slot: "green", revision: "new" },
        draining: [{ slot: "blue", revision: "old" }],
      },
      blue: clientPort({ reconnect: blueReconnect }),
      green: clientPort({ reconnect: greenReconnect }),
    });

    await expect(client.reconnect("old-room:token", "blue")).resolves.toBe(resumed);
    expect(blueReconnect).toHaveBeenCalledWith("old-room:token");
    expect(greenReconnect).not.toHaveBeenCalled();
    expect(connectionSlot(resumed)).toBe("blue");
  });

  it("resolves the current owner and consumes its seat reservation when handoff is advertised", async () => {
    const resumed = room("new-physical-room");
    const consume = vi.fn(async () => resumed);
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/room/resolve-owner")) {
        return Response.json({
          gameId: "logical-game-1",
          slot: "green",
          processId: "proc-2",
          physicalRoomId: "new-physical-room",
          ownerEpoch: 9,
          reconnectEndpoint: "/matchmake/reconnect",
        });
      }
      return Response.json({
        room: { name: "aegis", roomId: "new-physical-room", processId: "proc-2" },
        sessionId: "s2",
        reconnectionToken: "new-physical-room:token",
      });
    });
    const green = clientPort({ consumeSeatReservation: consume });
    const client = new AegisConnectionRouter({
      loadManifest: async () => ({
        version: 1,
        capabilities: { liveRoomHandoff: true },
        active: { slot: "green", revision: "new" },
        draining: [],
      }),
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: () => green,
      fetcher,
    });
    const saved: ReconnectSession = {
      reconnectionToken: "old-room:secret",
      roomId: "old-room",
      slot: "blue",
      savedAt: Date.now(),
      logicalSession: { gameId: "logical-game-1", ownerEpoch: 8 },
      resumeCredential: "x".repeat(43),
      resumeCredentialExpiresAt: Date.now() + 60_000,
    };

    await expect(client.resumeSession(saved)).resolves.toBe(resumed);

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://example.test/api/green/room/resolve-owner",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ gameId: "logical-game-1", resumeCredential: "x".repeat(43), minimumOwnerEpoch: 8 }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        body: expect.not.stringContaining("old-room:secret"),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://example.test/api/green/matchmake/reconnect",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          gameId: "logical-game-1",
          resumeCredential: "x".repeat(43),
          physicalRoomId: "new-physical-room",
          ownerEpoch: 9,
        }),
      }),
    );
    expect(consume).toHaveBeenCalledWith(
      expect.objectContaining({ room: expect.objectContaining({ roomId: "new-physical-room", processId: "proc-2" }) }),
    );
    expect(connectionSlot(resumed)).toBe("green");
    expect(roomHandoffIdentity(resumed)).toEqual({ gameId: "logical-game-1", ownerEpoch: 9 });
  });

  it("keeps SDK reconnect when the handoff capability is absent", async () => {
    const resumed = room("old-room");
    const legacyReconnect = vi.fn(async () => resumed);
    const fetcher = vi.fn(async () => Response.json({}));
    const client = new AegisConnectionRouter({
      loadManifest: async () => ({ version: 1, active: { slot: "green", revision: "new" }, draining: [] }),
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: () => clientPort({ reconnect: legacyReconnect }),
      fetcher,
    });

    await expect(
      client.resumeSession({
        reconnectionToken: "old-room:secret",
        roomId: "old-room",
        slot: "blue",
        savedAt: Date.now(),
        logicalSession: { gameId: "logical-game-1", ownerEpoch: 8 },
      }),
    ).resolves.toBe(resumed);
    expect(legacyReconnect).toHaveBeenCalledWith("old-room:secret");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps legacy reconnect for an old session without a separate resume credential", async () => {
    const resumed = room("old-room");
    const legacyReconnect = vi.fn(async () => resumed);
    const fetcher = vi.fn(async () => Response.json({}));
    const client = new AegisConnectionRouter({
      loadManifest: async () => ({
        version: 1,
        capabilities: { liveRoomHandoff: true },
        active: { slot: "green", revision: "new" },
        draining: [],
      }),
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: () => clientPort({ reconnect: legacyReconnect }),
      fetcher,
    });

    await expect(
      client.resumeSession({
        reconnectionToken: "old-room:secret",
        roomId: "old-room",
        slot: "blue",
        savedAt: Date.now(),
        logicalSession: { gameId: "logical-game-1", ownerEpoch: 8 },
      }),
    ).resolves.toBe(resumed);
    expect(legacyReconnect).toHaveBeenCalledWith("old-room:secret");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refreshes the manifest once when active starts draining during matchmaking", async () => {
    const manifests: DeploymentManifest[] = [
      { version: 1, active: { slot: "blue", revision: "old" }, draining: [] },
      { version: 1, active: { slot: "green", revision: "new" }, draining: [{ slot: "blue", revision: "old" }] },
    ];
    const loadManifest = vi.fn(async () => manifests.shift() ?? manifests[0]!);
    const blueJoinOrCreate = vi.fn(async () => {
      throw Object.assign(new Error("This game server is draining; retry on the active slot."), { code: 503 });
    });
    const greenRoom = room("green-room");
    const greenJoinOrCreate = vi.fn(async () => greenRoom);
    const clients: Record<string, ColyseusClientPort> = {
      blue: clientPort({ joinOrCreate: blueJoinOrCreate }),
      green: clientPort({ joinOrCreate: greenJoinOrCreate }),
    };
    const client = new AegisConnectionRouter({
      loadManifest,
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: (_endpoint, slot) => clients[slot]!,
      fetcher: vi.fn(async () => new Response("{}", { status: 404 })),
    });

    await expect(client.joinOrCreate(OPTIONS)).resolves.toBe(greenRoom);
    expect(loadManifest).toHaveBeenCalledTimes(2);
    expect(connectionSlot(greenRoom)).toBe("green");
  });
});
