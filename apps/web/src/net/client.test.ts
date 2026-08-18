import { describe, expect, it, vi } from "vitest";
import type { Room } from "colyseus.js";
import type { GameState } from "@aegis/shared";
import {
  AegisConnectionRouter,
  connectionSlot,
  type ColyseusClientPort,
} from "./client";
import type { DeploymentManifest, DeploymentSlot } from "./deployment";

const OPTIONS = { displayName: "Tamer", deck: { mainDeck: [], eggDeck: [] } };

function room(roomId: string): Room<GameState> {
  return { roomId, reconnectionToken: `${roomId}:token` } as Room<GameState>;
}

function clientPort(overrides: Partial<ColyseusClientPort> = {}): ColyseusClientPort {
  const unavailable = async () => { throw new Error("no room"); };
  return {
    join: unavailable,
    joinOrCreate: unavailable,
    create: unavailable,
    joinById: unavailable,
    reconnect: unavailable,
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
  const clients: Record<DeploymentSlot, ColyseusClientPort> = { blue, green };
  return new AegisConnectionRouter({
    loadManifest: async () => manifest,
    endpointForSlot: (slot) => ({ http: `https://example.test/api/${slot}`, websocket: `wss://example.test/api/${slot}` }),
    createClient: (_endpoint, slot) => clients[slot],
    fetcher: vi.fn(async () => new Response("{}", { status: 404 })),
  });
}

describe("room-scoped deployment affinity", () => {
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
    const clients = {
      blue: clientPort({ create: blueCreate }),
      green: clientPort({ create: greenCreate }),
    };
    const client = new AegisConnectionRouter({
      loadManifest,
      endpointForSlot: (slot) => ({ http: `https://example.test/api/${slot}`, websocket: `wss://example.test/api/${slot}` }),
      createClient: (_endpoint, slot) => clients[slot],
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
    const clients = {
      blue: clientPort({ joinOrCreate: blueJoinOrCreate }),
      green: clientPort({ joinOrCreate: greenJoinOrCreate }),
    };
    const client = new AegisConnectionRouter({
      loadManifest,
      endpointForSlot: (slot) => ({ http: `https://example.test/api/${slot}`, websocket: `wss://example.test/api/${slot}` }),
      createClient: (_endpoint, slot) => clients[slot],
      fetcher: vi.fn(async () => new Response("{}", { status: 404 })),
    });

    await expect(client.joinOrCreate(OPTIONS)).resolves.toBe(greenRoom);
    expect(loadManifest).toHaveBeenCalledTimes(2);
    expect(connectionSlot(greenRoom)).toBe("green");
  });
});
