#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { Client } from "../apps/web/node_modules/colyseus.js/build/esm/index.mjs";

const ADMIN_TOKEN = "blue-green-smoke-admin-token";
const ROOM_TYPE = "aegis";
const children = [];
const rooms = [];

try {
  const [bluePort, greenPort] = await Promise.all([freePort(), freePort()]);
  const blue = startApi("blue", "smoke-blue", bluePort);
  const green = startApi("green", "smoke-green", greenPort);
  children.push(blue.child, green.child);
  await Promise.all([waitForHealth(bluePort), waitForHealth(greenPort)]);

  const blueClient = new Client(`ws://127.0.0.1:${bluePort}`);
  const blueOpponent = new Client(`ws://127.0.0.1:${bluePort}`);
  const blueRoom = await blueClient.joinOrCreate(ROOM_TYPE, options("Blue A"));
  const bluePeerRoom = await blueOpponent.joinOrCreate(ROOM_TYPE, options("Blue B"));
  rooms.push(blueRoom, bluePeerRoom);
  blueRoom.send("ready", {});
  bluePeerRoom.send("ready", {});

  const blueBefore = await deploymentStatus(bluePort);
  assert(blueBefore.activeRooms === 1, `expected one blue room, got ${blueBefore.activeRooms}`);
  await deploymentControl(bluePort, "drain");

  const rejected = await fetch(`http://127.0.0.1:${bluePort}/matchmake/joinOrCreate/${ROOM_TYPE}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options("Blocked")),
  });
  assert(rejected.status === 503, `draining blue accepted room creation (${rejected.status})`);

  const greenClient = new Client(`ws://127.0.0.1:${greenPort}`);
  const greenOpponent = new Client(`ws://127.0.0.1:${greenPort}`);
  const greenRoom = await greenClient.joinOrCreate(ROOM_TYPE, options("Green A"));
  const greenPeerRoom = await greenOpponent.joinOrCreate(ROOM_TYPE, options("Green B"));
  rooms.push(greenRoom, greenPeerRoom);

  const reconnectionToken = blueRoom.reconnectionToken;
  await blueRoom.leave(false);
  const resumedBlueRoom = await blueClient.reconnect(reconnectionToken);
  rooms.push(resumedBlueRoom);
  resumedBlueRoom.send("ready", {});

  const [blueAfter, greenAfter] = await Promise.all([
    deploymentStatus(bluePort),
    deploymentStatus(greenPort),
  ]);
  assert(blueAfter.activeRooms === 1, "blue room disappeared during cutover/reconnect");
  assert(blueAfter.connectedClients === 2, `blue reconnect did not restore both clients (${blueAfter.connectedClients})`);
  assert(greenAfter.activeRooms === 1, "new match did not land on green");

  process.stdout.write(`${JSON.stringify({
    status: "passed",
    blue: { revision: blueAfter.revision, activeRooms: blueAfter.activeRooms, connectedClients: blueAfter.connectedClients },
    green: { revision: greenAfter.revision, activeRooms: greenAfter.activeRooms, connectedClients: greenAfter.connectedClients },
  })}\n`);
} finally {
  await Promise.allSettled(rooms.map((room) => room.connection?.isOpen ? room.leave(true) : undefined));
  await delay(250);
  for (const child of children) {
    child.kill("SIGTERM");
    setTimeout(() => child.exitCode === null && child.kill("SIGKILL"), 2_000).unref();
  }
}

function startApi(slot, revision, port) {
  const child = spawn(process.execPath, ["apps/api/dist/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      AEGIS_DEPLOYMENT_SLOT: slot,
      AEGIS_REVISION: revision,
      AEGIS_DEPLOYMENT_ADMIN_TOKEN: ADMIN_TOKEN,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stderr.write(`[${slot}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${slot}] ${chunk}`));
  return { child, port };
}

async function waitForHealth(port) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // Process is still starting.
    }
    await delay(250);
  }
  throw new Error(`API on port ${port} did not become healthy`);
}

async function deploymentStatus(port) {
  const response = await fetch(`http://127.0.0.1:${port}/deployment/status`, {
    headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  if (!response.ok) throw new Error(`deployment status failed (${response.status})`);
  return response.json();
}

async function deploymentControl(port, operation) {
  const response = await fetch(`http://127.0.0.1:${port}/deployment/${operation}`, {
    method: "POST",
    headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  if (!response.ok) throw new Error(`deployment ${operation} failed (${response.status})`);
  return response.json();
}

function options(displayName) {
  return { displayName, deck: { mainDeck: [], eggDeck: [] } };
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("could not allocate a test port");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
