import { createServer, type Server } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDeploymentRuntime,
  installDeploymentRoutes,
} from "./runtime.js";

const ADMIN_TOKEN = "test-deployment-admin-token";

interface Harness {
  baseUrl: string;
  close: () => Promise<void>;
  counts: { rooms: number; clients: number };
  setReady: (ready: boolean) => void;
}

const openServers: Server[] = [];

async function startHarness({ acceptingNewRooms = true } = {}): Promise<Harness> {
  const app = express();
  const counts = { rooms: 2, clients: 3 };
  let ready = true;
  const runtime = createDeploymentRuntime({
    slot: "blue",
    revision: "abc123",
    adminToken: ADMIN_TOKEN,
    activeRooms: () => counts.rooms,
    connectedClients: () => counts.clients,
    readiness: async () => ready,
    acceptingNewRooms,
  });

  app.use(express.json());
  installDeploymentRoutes({ app, runtime });
  app.post("/matchmake/:method/:room", (req, res) => {
    res.json({ accepted: req.params.method });
  });

  const server = createServer(app);
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind a TCP port");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
    counts,
    setReady(value) { ready = value; },
  };
}

async function adminPost(baseUrl: string, path: string, token = ADMIN_TOKEN): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  })));
});

describe("deployment HTTP contract", () => {
  it("can start closed until the deployment controller activates it", async () => {
    const harness = await startHarness({ acceptingNewRooms: false });

    expect((await fetch(`${harness.baseUrl}/matchmake/create/aegis`, { method: "POST" })).status).toBe(503);
    expect((await adminPost(harness.baseUrl, "/deployment/activate")).status).toBe(200);
    expect((await fetch(`${harness.baseUrl}/matchmake/create/aegis`, { method: "POST" })).status).toBe(200);

    await harness.close();
  });

  it("reports slot health and protects detailed room status", async () => {
    const harness = await startHarness();

    const health = await fetch(`${harness.baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({
      status: "ok",
      slot: "blue",
      revision: "abc123",
      acceptingNewRooms: true,
    });

    expect((await fetch(`${harness.baseUrl}/deployment/status`)).status).toBe(401);
    const status = await fetch(`${harness.baseUrl}/deployment/status`, {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(await status.json()).toMatchObject({
      slot: "blue",
      revision: "abc123",
      acceptingNewRooms: true,
      activeRooms: 2,
      connectedClients: 3,
    });

    await harness.close();
  });

  it("drains idempotently while preserving reconnect and existing-room joins", async () => {
    const harness = await startHarness();

    expect((await adminPost(harness.baseUrl, "/deployment/drain", "wrong-token")).status).toBe(401);
    expect((await adminPost(harness.baseUrl, "/deployment/drain")).status).toBe(200);
    expect((await adminPost(harness.baseUrl, "/deployment/drain")).status).toBe(200);

    for (const method of ["reconnect", "join", "joinById"]) {
      const response = await fetch(`${harness.baseUrl}/matchmake/${method}/aegis`, { method: "POST" });
      expect(response.status, method).toBe(200);
    }
    for (const method of ["create", "joinOrCreate"]) {
      const response = await fetch(`${harness.baseUrl}/matchmake/${method}/aegis`, { method: "POST" });
      expect(response.status, method).toBe(503);
      expect(await response.json()).toEqual({
        code: "AEGIS_DEPLOYMENT_DRAINING",
        error: "This game server is draining; retry on the active slot.",
      });
    }

    expect((await adminPost(harness.baseUrl, "/deployment/activate")).status).toBe(200);
    expect((await fetch(`${harness.baseUrl}/matchmake/joinOrCreate/aegis`, { method: "POST" })).status).toBe(200);

    await harness.close();
  });

  it("exposes readiness independently from liveness", async () => {
    const harness = await startHarness();
    harness.setReady(false);

    expect((await fetch(`${harness.baseUrl}/health`)).status).toBe(200);
    const unavailable = await fetch(`${harness.baseUrl}/ready`);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ status: "not_ready", slot: "blue", revision: "abc123" });

    harness.setReady(true);
    expect((await fetch(`${harness.baseUrl}/ready`)).status).toBe(200);

    await harness.close();
  });
});
