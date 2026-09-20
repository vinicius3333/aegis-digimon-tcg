import { createServer, type Server as HttpServer } from "node:http";
import { createHash } from "node:crypto";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { RoomHandoffStore } from "../db/roomHandoff/RoomHandoffStore.js";
import { createLogicalRoomReconnectHandler, RoomHandoffCoordinator } from "./roomHandoff.js";
import { DeploymentServer } from "./DeploymentServer.js";
import { createDeploymentRuntime } from "./runtime.js";

const RESUME_CREDENTIAL = "r".repeat(43);
const GAME_ID = "logical-resume-game";
const ROOM_ID = "green-resumed-room";
const OWNER = { generationId: "green", processId: "green-process", roomId: ROOM_ID };

type RunningServer = { url: string; server: DeploymentServer; http: HttpServer };
const running: RunningServer[] = [];

async function startServer(handler?: ReturnType<typeof createLogicalRoomReconnectHandler>): Promise<RunningServer> {
  const http = createServer();
  const runtime = createDeploymentRuntime({
    slot: "green",
    revision: "resume-test",
    adminToken: "unused",
    activeRooms: () => 1,
    connectedClients: () => 0,
    readiness: async () => true,
  });
  const server = new DeploymentServer(
    runtime,
    {
      transport: new WebSocketTransport({ server: http }),
      gracefullyShutdown: false,
      greet: false,
    },
    handler,
  );
  await server.listen(0, "127.0.0.1");
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Colyseus reconnect test server failed to bind");
  const runningServer = { url: `http://127.0.0.1:${address.port}`, server, http };
  running.push(runningServer);
  return runningServer;
}

afterEach(async () => {
  await Promise.all(running.splice(0).map(async ({ server, http }) => {
    await server.gracefullyShutdown(false);
    if (http.listening) await new Promise<void>((resolve) => http.close(() => resolve()));
  }));
});

describe("logical room reconnect matchmake endpoint", () => {
  it("verifies the owner and issues a standard seat reservation over HTTP", async () => {
    const pool = createMemoryPool();
    const store = new RoomHandoffStore(pool);
    await store.createSession({
      sessionId: GAME_ID,
      mode: "casual",
      participants: [
        { seat: 0, kind: "account", principalId: "account-a" },
        { seat: 1, kind: "account", principalId: "account-b" },
      ],
      owner: OWNER,
      now: Date.now(),
    });
    await store.rotateResumeCredential({
      sessionId: GAME_ID,
      participantId: "account-a",
      credentialHash: createHash("sha256").update(RESUME_CREDENTIAL).digest("hex"),
      now: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    const coordinator = new RoomHandoffCoordinator({
      generationId: "green",
      processId: "green-process",
      store,
      rooms: {
        inspectSource: async () => ({ eligible: true }),
        reserveDestination: async () => OWNER,
        freezeSource: async () => true,
        saveSourceCheckpoint: async () => true,
        validateDestination: async () => true,
        activateDestination: async () => true,
        disposeSource: async () => true,
        unfreezeSource: async () => true,
        discardDestination: async () => true,
      },
    });
    const createRoomTicket = vi.fn(async (accountId: string) => `ticket-for-${accountId}`);
    const joinById = vi.fn(async (roomId: string, options: { authTicket: string }) => ({
      room: { name: "aegis", roomId, processId: OWNER.processId },
      sessionId: "colyseus-seat-session",
      authTicket: options.authTicket,
    }));
    const handler = createLogicalRoomReconnectHandler({
      coordinator,
      currentGenerationId: "green",
      verifyResumeCredential: (gameId, credential) => store.verifyResumeCredential({
        sessionId: gameId,
        credentialHash: createHash("sha256").update(credential).digest("hex"),
        now: Date.now(),
      }),
      createRoomTicket,
      joinById,
    });
    const app = await startServer(handler);
    const response = await fetch(`${app.url}/matchmake/reconnect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameId: GAME_ID,
        resumeCredential: RESUME_CREDENTIAL,
        physicalRoomId: ROOM_ID,
        ownerEpoch: 1,
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      room: { roomId: ROOM_ID, processId: OWNER.processId },
      sessionId: "colyseus-seat-session",
    });
    expect(createRoomTicket).toHaveBeenCalledExactlyOnceWith("account-a");
    expect(joinById).toHaveBeenCalledExactlyOnceWith(ROOM_ID, { authTicket: "ticket-for-account-a" });

    await pool.end();
  });

  it("returns credential, stale-owner, missing-session, and transient failures with their HTTP contracts", async () => {
    const pool = createMemoryPool();
    const store = new RoomHandoffStore(pool);
    await store.createSession({
      sessionId: GAME_ID,
      mode: "casual",
      participants: [{ seat: 0, kind: "account", principalId: "account-a" }, { seat: 1, kind: "account", principalId: "account-b" }],
      owner: OWNER,
      now: Date.now(),
    });
    await store.rotateResumeCredential({
      sessionId: GAME_ID,
      participantId: "account-a",
      credentialHash: createHash("sha256").update(RESUME_CREDENTIAL).digest("hex"),
      now: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    const coordinator = new RoomHandoffCoordinator({
      generationId: "green",
      processId: OWNER.processId,
      store,
      rooms: {
        inspectSource: async () => ({ eligible: true }),
        reserveDestination: async () => OWNER,
        freezeSource: async () => true,
        saveSourceCheckpoint: async () => true,
        validateDestination: async () => true,
        activateDestination: async () => true,
        disposeSource: async () => true,
        unfreezeSource: async () => true,
        discardDestination: async () => true,
      },
    });
    let joinFails = false;
    const joinById = vi.fn(async () => {
      if (joinFails) throw new Error("redis timeout");
      return { room: { roomId: ROOM_ID }, sessionId: "seat" };
    });
    const handler = createLogicalRoomReconnectHandler({
      coordinator,
      currentGenerationId: "green",
      verifyResumeCredential: (gameId, credential) =>
        gameId === "missing-session" && credential === RESUME_CREDENTIAL
          ? Promise.resolve("account-a")
          : store.verifyResumeCredential({
              sessionId: gameId,
              credentialHash: createHash("sha256").update(credential).digest("hex"),
              now: Date.now(),
            }),
      createRoomTicket: async () => "ticket",
      joinById,
    });
    const app = await startServer(handler);
    const post = (body: Record<string, unknown>) => fetch(`${app.url}/matchmake/reconnect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const baseRequest = { gameId: GAME_ID, resumeCredential: RESUME_CREDENTIAL, physicalRoomId: ROOM_ID, ownerEpoch: 1 };

    expect((await post({ ...baseRequest, resumeCredential: "x".repeat(43) })).status).toBe(401);
    const stale = await post({ ...baseRequest, ownerEpoch: 2 });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: "ROOM_OWNER_EPOCH_STALE", ownerEpoch: 1 });
    expect(joinById).not.toHaveBeenCalled();

    const missing = await post({ ...baseRequest, gameId: "missing-session" });
    expect(missing.status).toBe(404);

    joinFails = true;
    const transient = await post(baseRequest);
    expect(transient.status).toBe(503);
    expect(await transient.json()).toEqual({ error: "ROOM_RECONNECT_UNAVAILABLE" });
    await pool.end();
  });

  it("keeps the logical endpoint absent when the capability is disabled", async () => {
    const app = await startServer();
    const response = await fetch(`${app.url}/matchmake/reconnect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "ROOM_HANDOFF_UNAVAILABLE" });
  });
});
