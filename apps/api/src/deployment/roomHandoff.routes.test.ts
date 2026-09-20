import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import express from "express";
import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { RoomHandoffStore } from "../db/roomHandoff/RoomHandoffStore.js";
import {
  installRoomHandoffRoutes,
  installRoomOwnerResolutionRoute,
  RoomHandoffCoordinator,
  type RoomHandoffRoomPort,
} from "./roomHandoff.js";

const openServers: Server[] = [];
const TEST_RESUME_CREDENTIAL = "R".repeat(43);

async function ownerRouteHarness({
  enabled = true,
  credentialVerifier,
}: {
  enabled?: boolean;
  credentialVerifier?: (gameId: string, credential: string) => Promise<string | undefined>;
} = {}) {
  const pool: Pool = createMemoryPool();
  const store = new RoomHandoffStore(pool);
  await store.createSession({
    sessionId: "logical-game-1",
    mode: "casual",
    participants: [
      { seat: 0, kind: "account", principalId: "account-1" },
      { seat: 1, kind: "account", principalId: "account-2" },
    ],
    owner: { generationId: "g-0123456789ab", processId: "api-p2", roomId: "physical-room-9" },
    now: 1,
  });
  const credentialNow = Date.now();
  await store.rotateResumeCredential({
    sessionId: "logical-game-1",
    participantId: "account-1",
    credentialHash: createHash("sha256").update(TEST_RESUME_CREDENTIAL).digest("hex"),
    now: credentialNow,
    expiresAt: credentialNow + 60_000,
  });
  const verifyResumeCredential = credentialVerifier ?? ((gameId: string, credential: string) =>
    store.verifyResumeCredential({
      sessionId: gameId,
      credentialHash: createHash("sha256").update(credential).digest("hex"),
      now: Date.now(),
    }));
  const app = express();
  app.use(express.json());
  const coordinator = new RoomHandoffCoordinator({
    generationId: "g-0123456789ab",
    processId: "api-p2",
    store,
    rooms: {
      inspectSource: async () => ({ eligible: true }),
      reserveDestination: async () => ({ generationId: "green", processId: "api-p1", roomId: "target" }),
      freezeSource: async () => true,
      saveSourceCheckpoint: async () => true,
      validateDestination: async () => true,
      activateDestination: async () => true,
      disposeSource: async () => true,
      unfreezeSource: async () => true,
      discardDestination: async () => true,
    },
  });
  installRoomHandoffRoutes({ app, runtime: { isAuthorized: (value) => value === "Bearer admin-secret" }, coordinator, enabled });
  installRoomOwnerResolutionRoute({ app, coordinator, enabled, verifyResumeCredential });
  const server = createServer(app);
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server failed to bind");
  return { baseUrl: `http://127.0.0.1:${address.port}`, close: async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  } };
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  })));
});

describe("room handoff HTTP routes", () => {
  it("coordinates isolated generation ports, recovers a lost switch response, and permits blue cleanup", async () => {
    const pool: Pool = createMemoryPool();
    const store = new RoomHandoffStore(pool);
    const secret = "route-harness-secret-with-32-byte-minimum";
    const transferId = "isolated-transfer-1234";
    const sessionId = "isolated-session-1234";
    const sourceOwner = { generationId: "blue", processId: "blue-process", roomId: "blue-room" };
    const targetOwner = { generationId: "green", processId: "green-process", roomId: "green-room" };
    await store.createSession({
      sessionId,
      mode: "casual",
      participants: [
        { seat: 0, kind: "account", principalId: "account-a" },
        { seat: 1, kind: "account", principalId: "account-b" },
      ],
      owner: sourceOwner,
      now: 1,
    });

    const sourceInspect = vi.fn(async () => ({ eligible: true }));
    const destinationInspect = vi.fn(async () => {
      throw new Error("isolated green Redis namespace cannot call a blue room");
    });
    const sourcePorts: RoomHandoffRoomPort = {
      inspectSource: sourceInspect,
      reserveDestination: async () => { throw new Error("source slot must not reserve destination rooms"); },
      freezeSource: async () => true,
      saveSourceCheckpoint: async ({ commandSequence }) => (await store.saveCheckpoint({
        sessionId,
        ownerEpoch: 1,
        checkpointId: "isolated-checkpoint-1234",
        snapshotSchemaVersion: 1,
        executionVersion: "engine-v1",
        rulesVersion: "rules-v1",
        sourceRevision: "source-v1",
        commandSequence,
        checksum: "sha256:fixture",
        snapshot: { phase: "main" },
        now: 2,
      })).ok,
      validateDestination: async () => true,
      activateDestination: async () => true,
      disposeSource: async () => true,
      unfreezeSource: async () => true,
      discardDestination: async () => true,
      authoritativePendingTasks: async () => 0,
    };
    let redeemedTokenHash: string | undefined;
    const destinationPorts: RoomHandoffRoomPort = {
      inspectSource: destinationInspect,
      reserveDestination: async ({ reservationToken }) => {
        redeemedTokenHash = createHash("sha256").update(reservationToken).digest("hex");
        const redeemed = await store.redeemRoomHandoffReservation({
          tokenHash: redeemedTokenHash,
          destinationGenerationId: "green",
          ownerEpoch: 2,
          roomId: targetOwner.roomId,
          processId: targetOwner.processId,
          now: 3,
        });
        if (!redeemed) throw new Error("destination reservation was not valid");
        return targetOwner;
      },
      freezeSource: async () => true,
      saveSourceCheckpoint: async () => true,
      validateDestination: async () => true,
      activateDestination: async () => true,
      disposeSource: async () => true,
      unfreezeSource: async () => true,
      discardDestination: async () => true,
      authoritativePendingTasks: async () => 0,
    };
    const sourceCoordinator = new RoomHandoffCoordinator({
      generationId: "blue",
      processId: sourceOwner.processId,
      authorizationSecret: secret,
      store,
      rooms: sourcePorts,
    });
    const destinationCoordinator = new RoomHandoffCoordinator({
      generationId: "green",
      processId: targetOwner.processId,
      authorizationSecret: secret,
      store,
      rooms: destinationPorts,
    });

    const open = async (coordinator: RoomHandoffCoordinator, generationId: string, withOwnerResolution = false) => {
      const app = express();
      app.use(express.json());
      installRoomHandoffRoutes({
        app,
        runtime: { isAuthorized: (value) => value === "Bearer integration-admin" },
        coordinator,
        enabled: true,
      });
      if (withOwnerResolution) {
        installRoomOwnerResolutionRoute({
          app,
          coordinator,
          enabled: true,
          verifyResumeCredential: async (gameId, credential) =>
            gameId === sessionId && credential === "resume-a" ? "account-a" : undefined,
        });
      }
      const server = createServer(app);
      openServers.push(server);
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("isolated slot fixture failed to bind");
      return { generationId, server, baseUrl: `http://127.0.0.1:${address.port}` };
    };
    const blue = await open(sourceCoordinator, "blue");
    const green = await open(destinationCoordinator, "green", true);
    const request = async (
      slot: typeof blue | typeof green,
      route: string,
      body?: Record<string, unknown>,
      method = "POST",
    ) => {
      const response = await fetch(`${slot.baseUrl}${route}`, {
        method,
        headers: {
          authorization: "Bearer integration-admin",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json().catch(() => undefined);
      if (!response.ok) throw Object.assign(new Error(JSON.stringify(result)), { status: response.status });
      return result as Record<string, any>;
    };

    try {
      const compatibility = await request(blue, "/deployment/handoff/compatibility", {
        sourceSlot: "blue",
        destinationSlot: "green",
      });
      expect(compatibility).toMatchObject({ compatible: true, rooms: [{ roomId: "blue-room" }] });
      const { sourceAuthorization } = await request(blue, "/deployment/handoff/authorize-destination", {
        transferId,
        sessionId,
        expectedOwnerEpoch: 1,
        sourceSlot: "blue",
        destinationSlot: "green",
      });
      const reserved = await request(green, "/deployment/handoff/destinations/reserve", {
        transferId,
        sessionId,
        expectedOwnerEpoch: 1,
        sourceSlot: "blue",
        destinationSlot: "green",
        sourceAuthorization,
      });
      expect(reserved).toMatchObject({ target: targetOwner, transfer: { status: "preparing" } });
      expect(sourceInspect).toHaveBeenCalledTimes(2);
      expect(destinationInspect).not.toHaveBeenCalled();
      expect(redeemedTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(await store.redeemRoomHandoffReservation({
        tokenHash: redeemedTokenHash!,
        destinationGenerationId: "green",
        ownerEpoch: 2,
        roomId: "attacker-room",
        processId: "attacker-process",
        now: 4,
      })).toBeUndefined();

      await request(blue, "/deployment/handoff/prepare", {
        transferId,
        sourceSlot: "blue",
        executionVersion: "engine-v1",
        rulesVersion: "rules-v1",
        sourceRevision: "source-v1",
      });
      await request(green, `/deployment/handoff/transfers/${transferId}/validate`, {
        destinationSlot: "green",
        executionVersion: "engine-v1",
        rulesVersion: "rules-v1",
        sourceRevision: "source-v1",
      });

      // The controller's transport drops the response after the API has committed the owner switch.
      let claimResponseDropped = false;
      try {
        const response = await fetch(`${blue.baseUrl}/deployment/handoff/transfers/${transferId}/migrate`, {
          method: "POST",
          headers: { authorization: "Bearer integration-admin", "content-type": "application/json" },
          body: JSON.stringify({ sourceSlot: "blue" }),
        });
        expect(response.status).toBe(200);
        await response.arrayBuffer();
        throw new Error("simulated_response_lost_after_commit");
      } catch (error) {
        claimResponseDropped = error instanceof Error && error.message === "simulated_response_lost_after_commit";
      }
      expect(claimResponseDropped).toBe(true);
      const reconciled = await request(blue, `/deployment/handoff/transfers/${transferId}/reconcile`);
      expect(reconciled).toMatchObject({ owner: targetOwner, ownerEpoch: 2, transfer: { status: "owner_switched" } });
      await request(green, `/deployment/handoff/transfers/${transferId}/activate`, { destinationSlot: "green" });
      await request(blue, `/deployment/handoff/transfers/${transferId}/complete`, { sourceSlot: "blue" });

      // Blue can be stopped while the same logical game remains active on green.
      await new Promise<void>((resolve) => blue.server.close(() => resolve()));
      const owner = await fetch(`${green.baseUrl}/room/resolve-owner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: sessionId, resumeCredential: "resume-a", minimumOwnerEpoch: 2 }),
      });
      expect(owner.status).toBe(200);
      expect(await owner.json()).toMatchObject({
        slot: "green",
        physicalRoomId: "green-room",
        ownerEpoch: 2,
      });
      const cleanup = await request(blue, "/deployment/handoff/cleanup-safety?slot=blue", undefined, "GET").catch((error) => error);
      expect(cleanup).toBeInstanceOf(Error); // blue is already terminated; query cleanup through the retained coordinator below.
      await expect(sourceCoordinator.cleanupSafety("blue")).resolves.toMatchObject({
        ownershipVerified: true,
        authoritativeRooms: 0,
        inFlightTransfers: 0,
        pendingTasks: 0,
      });
      expect(await store.getSession(sessionId)).toMatchObject({ owner: targetOwner, ownerEpoch: 2, status: "active" });
    } finally {
      await pool.end();
    }
  });

  it("resolves an authenticated logical game to the durable current owner without echoing credentials", async () => {
    const harness = await ownerRouteHarness();
    const response = await fetch(`${harness.baseUrl}/room/resolve-owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: "logical-game-1", resumeCredential: TEST_RESUME_CREDENTIAL, minimumOwnerEpoch: 0 }),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toEqual({
      gameId: "logical-game-1",
      slot: "g-0123456789ab",
      processId: "api-p2",
      physicalRoomId: "physical-room-9",
      ownerEpoch: 1,
      reconnectEndpoint: "/matchmake/reconnect",
    });
    expect(JSON.stringify(result)).not.toContain(TEST_RESUME_CREDENTIAL);

    const privateAdmin = await fetch(`${harness.baseUrl}/deployment/handoff/cleanup-safety?slot=g-0123456789ab`);
    expect(privateAdmin.status).toBe(401);
    const compatibility = await fetch(`${harness.baseUrl}/deployment/handoff/compatibility`, {
      method: "POST",
      headers: { authorization: "Bearer admin-secret", "content-type": "application/json" },
      body: JSON.stringify({ sourceSlot: "g-0123456789ab", destinationSlot: "green" }),
    });
    expect(compatibility.status).toBe(200);
    expect(await compatibility.json()).toMatchObject({
      compatible: true,
      rooms: [{ sessionId: "logical-game-1", roomId: "physical-room-9", ownerEpoch: 1 }],
    });
    await harness.close();
  });

  it("returns explicit invalid-credential and directory-staleness errors and stays disabled without rollout", async () => {
    const harness = await ownerRouteHarness();
    const invalid = await fetch(`${harness.baseUrl}/room/resolve-owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: "logical-game-1", resumeCredential: "not-a-credential" }),
    });
    expect(invalid.status).toBe(401);
    expect(await invalid.json()).toEqual({ error: "ROOM_RESUME_CREDENTIAL_INVALID" });

    const stale = await fetch(`${harness.baseUrl}/room/resolve-owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: "logical-game-1", resumeCredential: TEST_RESUME_CREDENTIAL, minimumOwnerEpoch: 3 }),
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: "ROOM_OWNER_EPOCH_STALE", ownerEpoch: 1 });
    await harness.close();

    const disabled = await ownerRouteHarness({ enabled: false });
    const response = await fetch(`${disabled.baseUrl}/room/resolve-owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: "logical-game-1", resumeCredential: TEST_RESUME_CREDENTIAL }),
    });
    expect(response.status).toBe(404);
    await disabled.close();
  });
});
