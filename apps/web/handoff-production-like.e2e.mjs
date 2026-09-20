import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Client } from "colyseus.js";
import { DECISION_CHANNEL, EVENT_CHANNEL, GameState, Phase, ROOM_TYPE } from "@aegis/shared";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const runId = randomUUID().replaceAll("-", "").slice(0, 16);
const dockerNames = [];
const apiProcesses = [];
const clientRooms = [];
const childLogs = new Map();
const adminToken = "handoff-e2e-admin-" + runId;
const descriptorSecret = "handoff-e2e-descriptor-secret-" + runId + "-at-least-32-bytes";
const databaseUser = "aegis_e2e";
const databasePassword = "pw-" + runId + "-e2e";
const databaseName = "aegis_handoff_e2e";

try {
  const postgres = await startContainer("postgres:16-alpine", "postgres", [
    "--env", "POSTGRES_USER=" + databaseUser,
    "--env", "POSTGRES_PASSWORD=" + databasePassword,
    "--env", "POSTGRES_DB=" + databaseName,
    "--publish", "127.0.0.1::5432",
  ]);
  const blueRedis = await startContainer("redis:7-alpine", "redis-blue", ["--publish", "127.0.0.1::6379"]);
  const greenRedis = await startContainer("redis:7-alpine", "redis-green", ["--publish", "127.0.0.1::6379"]);
  await waitFor(() => containerHealthy(postgres.name, ["pg_isready", "-U", databaseUser, "-d", databaseName]));
  await waitFor(() => containerHealthy(blueRedis.name, ["redis-cli", "ping"]));
  await waitFor(() => containerHealthy(greenRedis.name, ["redis-cli", "ping"]));

  const databaseUrl = "postgresql://" + databaseUser + ":" + databasePassword + "@127.0.0.1:" + postgres.port + "/" + databaseName;
  const blue = await startApi({ slot: "blue", redisPort: blueRedis.port, databaseUrl });
  const green = await startApi({ slot: "green", redisPort: greenRedis.port, databaseUrl });

  const { AccountStore } = await import("../api/dist/accounts/AccountStore.js");
  const { RED_DECK, BLUE_DECK } = await import("../api/dist/engine/testDecks.js");
  const accounts = new AccountStore(databaseUrl);
  await accounts.ensureReady();
  const accountA = await accounts.accountForIdentity("email", "a-" + runId + "@e2e.invalid", "E2E A " + runId);
  const accountB = await accounts.accountForIdentity("email", "b-" + runId + "@e2e.invalid", "E2E B " + runId);
  const ticketA = await accounts.createRoomTicket(accountA.id);
  const ticketB = await accounts.createRoomTicket(accountB.id);
  await accounts.close();

  const clientA = new Client(blue.url);
  const clientB = new Client(blue.url);
  const sourceRoomA = await clientA.joinOrCreate(ROOM_TYPE, {
    displayName: accountA.displayName,
    deck: structuredClone(RED_DECK),
    authTicket: ticketA,
  }, GameState);
  const sourceRoomB = await clientB.joinOrCreate(ROOM_TYPE, {
    displayName: accountB.displayName,
    deck: structuredClone(BLUE_DECK),
    authTicket: ticketB,
  }, GameState);
  clientRooms.push(sourceRoomA, sourceRoomB);
  assert.equal(sourceRoomA.roomId, sourceRoomB.roomId, "both clients must share the source room");

  for (const room of [sourceRoomA, sourceRoomB]) {
    room.onError(() => undefined);
    room.onMessage(EVENT_CHANNEL, (event) => {
      if (event?.kind === "actionRejected") console.error("bootstrap action rejected", event);
    });
    room.onMessage(DECISION_CHANNEL, (request) => {
      if (request?.kind === "mulligan") room.send("mulligan", { keep: true });
    });
  }
  await waitFor(() => sourceRoomA.state.matchId.length > 0 && sourceRoomB.state.matchId.length > 0);
  const sessionId = sourceRoomA.state.matchId;
  assert.equal(sourceRoomB.state.matchId, sessionId);
  const resumeA = await requestResumeCredential(sourceRoomA, sessionId);
  const resumeB = await requestResumeCredential(sourceRoomB, sessionId);

  sourceRoomA.send("ready");
  sourceRoomB.send("ready");
  try {
    await waitFor(
      () => sourceRoomA.state.phase === Phase.Breeding && sourceRoomB.state.phase === Phase.Breeding,
      30_000,
    );
    const turnPlayerRoom = sourceRoomA.state.turnSeat === 0 ? sourceRoomA : sourceRoomB;
    turnPlayerRoom.send("endPhase");
    await waitFor(
      () => sourceRoomA.state.phase === Phase.Main && sourceRoomB.state.phase === Phase.Main,
      30_000,
    );
  } catch (error) {
    console.error("source state at Main wait timeout", JSON.stringify({
      a: { phase: sourceRoomA.state.phase, matchId: sourceRoomA.state.matchId, players: sourceRoomA.state.players.length,
        pendingDecision: sourceRoomA.state.pendingDecision?.kind },
      b: { phase: sourceRoomB.state.phase, matchId: sourceRoomB.state.matchId, players: sourceRoomB.state.players.length,
        pendingDecision: sourceRoomB.state.pendingDecision?.kind },
    }));
    throw error;
  }
  const beforeA = seatSnapshot(sourceRoomA, 0);
  const beforeB = seatSnapshot(sourceRoomB, 1);
  assert.equal(beforeA.ownHand.length, 5);
  assert.equal(beforeB.ownHand.length, 5);

  const transferId = "e2e-" + runId;
  const compatibility = await apiRequest(blue, "/deployment/handoff/compatibility", {
    sourceSlot: "blue",
    destinationSlot: "green",
  });
  assert.equal(compatibility.compatible, true, JSON.stringify(compatibility));
  assert(compatibility.rooms.some((room) => room.sessionId === sessionId && room.compatible));

  const authorization = await apiRequest(blue, "/deployment/handoff/authorize-destination", {
    transferId,
    sessionId,
    expectedOwnerEpoch: 1,
    sourceSlot: "blue",
    destinationSlot: "green",
  });
  const reservation = await apiRequest(green, "/deployment/handoff/destinations/reserve", {
    transferId,
    sessionId,
    expectedOwnerEpoch: 1,
    sourceSlot: "blue",
    destinationSlot: "green",
    sourceAuthorization: authorization.sourceAuthorization,
  });
  assert.equal(reservation.target.generationId, "green");
  assert.notEqual(reservation.target.roomId, sourceRoomA.roomId);

  const sourceRevision = "handoff-production-like-e2e";
  const prepare = await apiRequest(blue, "/deployment/handoff/prepare", {
    transferId,
    sourceSlot: "blue",
    executionVersion: "engine-v1",
    rulesVersion: "rules-v1",
    sourceRevision,
  });
  assert.equal(prepare.status, "snapshot_saved");
  const validate = await apiRequest(green, "/deployment/handoff/transfers/" + transferId + "/validate", {
    destinationSlot: "green",
    executionVersion: "engine-v1",
    rulesVersion: "rules-v1",
    sourceRevision,
  });
  assert.equal(validate.status, "destination_validated");

  const lostReplyProxy = await startLostReplyProxy(blue.url);
  await assert.rejects(
    fetch(lostReplyProxy.url + "/deployment/handoff/transfers/" + transferId + "/migrate", {
      method: "POST",
      headers: { authorization: "Bearer " + adminToken, "content-type": "application/json" },
      body: JSON.stringify({ sourceSlot: "blue" }),
    }),
    /fetch failed|socket|reset|closed/i,
    "caller must observe a dropped reply after the owner switch commits",
  );
  await closeServer(lostReplyProxy.server);

  const reconciled = await apiRequest(green, "/deployment/handoff/transfers/" + transferId + "/reconcile", {});
  assert.equal(reconciled.owner.generationId, "green");
  assert.equal(reconciled.ownerEpoch, 2);
  assert.equal(reconciled.transfer.status, "owner_switched");

  await stopProcess(blue.process, "SIGKILL");
  await apiRequest(green, "/deployment/handoff/transfers/" + transferId + "/activate", { destinationSlot: "green" });

  const ownerA = await apiRequest(green, "/room/resolve-owner", {
    gameId: sessionId,
    resumeCredential: resumeA,
    minimumOwnerEpoch: 2,
  }, false);
  const ownerB = await apiRequest(green, "/room/resolve-owner", {
    gameId: sessionId,
    resumeCredential: resumeB,
    minimumOwnerEpoch: 2,
  }, false);
  assert.equal(ownerA.slot, "green");
  assert.equal(ownerB.physicalRoomId, ownerA.physicalRoomId);
  assert.equal(ownerA.ownerEpoch, 2);

  const reconnectA = await logicalReconnect(green, sessionId, resumeA, ownerA);
  const reconnectB = await logicalReconnect(green, sessionId, resumeB, ownerB);
  const resumedA = await new Client(green.url).consumeSeatReservation(reconnectA, GameState);
  const resumedB = await new Client(green.url).consumeSeatReservation(reconnectB, GameState);
  clientRooms.push(resumedA, resumedB);
  await waitFor(() => resumedA.state.phase === Phase.Main && resumedB.state.phase === Phase.Main);
  assert.deepEqual(seatSnapshot(resumedA, 0), beforeA);
  assert.deepEqual(seatSnapshot(resumedB, 1), beforeB);

  console.log(JSON.stringify({
    result: "passed",
    sessionId,
    transferId,
    sourceRoomId: sourceRoomA.roomId,
    destinationRoomId: ownerA.physicalRoomId,
    ownerEpoch: ownerA.ownerEpoch,
    participantsReconnected: 2,
    sourceKilledAfterOwnerSwitch: true,
    migrationReplyDropped: true,
    infrastructure: "ephemeral PostgreSQL + isolated blue/green Redis + two real API processes",
    client: "Colyseus JavaScript SDK over WebSocket; no browser UI",
  }));
} catch (error) {
  for (const info of apiProcesses) {
    const lines = childLogs.get(info) ?? [];
    if (lines.length > 0) console.error("[" + info.slot + " API, tail]\n" + lines.slice(-80).join("\n"));
  }
  throw error;
} finally {
  await Promise.all(clientRooms.map((room) => Promise.race([
    room.leave(false).catch(() => undefined),
    delay(500),
  ])));
  await Promise.all(apiProcesses.map(({ process }) => stopProcess(process, "SIGTERM")));
  for (const name of dockerNames.reverse()) {
    spawnSync("docker", ["rm", "--force", name], { cwd: repoRoot, stdio: "ignore" });
  }
}

async function startContainer(image, suffix, args) {
  const name = "aegis-handoff-" + suffix + "-" + runId;
  dockerNames.push(name);
  docker(["run", "--detach", "--rm", "--name", name, ...args, image]);
  const internalPort = suffix === "postgres" ? 5432 : 6379;
  return { name, port: mappedPort(name, internalPort) };
}

function mappedPort(name, internalPort) {
  const output = docker(["port", name, internalPort + "/tcp"]);
  const match = output.match(/:(\d+)\s*$/);
  if (!match) throw new Error("Docker did not publish " + internalPort + "/tcp for " + name + ": " + output);
  return Number(match[1]);
}

function containerHealthy(name, command) {
  const result = spawnSync("docker", ["exec", name, ...command], { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 && (command[0] !== "redis-cli" || result.stdout.trim() === "PONG");
}

async function startApi({ slot, redisPort, databaseUrl }) {
  const port = await freePort();
  const process = spawn(globalThis.process.execPath, ["--enable-source-maps", "apps/api/dist/index.js"], {
    cwd: repoRoot,
    env: {
      ...globalThis.process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      AEGIS_REDIS_URL: "redis://127.0.0.1:" + redisPort,
      AEGIS_PROCESS_PATH: slot + "-api",
      AEGIS_PUBLIC_HOST: "127.0.0.1:" + port,
      AEGIS_DEPLOYMENT_SLOT: slot,
      AEGIS_DEPLOYMENT_GENERATION_ID: slot,
      AEGIS_DEPLOYMENT_ADMIN_TOKEN: adminToken,
      AEGIS_ROOM_HANDOFF_DESCRIPTOR_SECRET: descriptorSecret,
      AEGIS_ROOM_HANDOFF_SERVER: "1",
      AEGIS_ROOM_HANDOFF_EXPERIMENT: "1",
      AEGIS_REVISION: "handoff-production-like-e2e",
      AEGIS_WEB_URL: "http://127.0.0.1:5173",
      TOURNAMENT_SCHEDULER: "off",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const info = { slot, process };
  apiProcesses.push(info);
  const logLines = [];
  childLogs.set(info, logLines);
  for (const stream of [process.stdout, process.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      logLines.push(...chunk.trimEnd().split("\n"));
      if (logLines.length > 250) logLines.splice(0, logLines.length - 250);
    });
  }
  const server = { slot, port, url: "http://127.0.0.1:" + port };
  await waitFor(async () => {
    if (process.exitCode !== null) throw new Error(slot + " API process exited: " + process.exitCode);
    const response = await fetch(server.url + "/ready").catch(() => undefined);
    return response?.status === 200;
  }, 90_000);
  return { ...server, process };
}

async function requestResumeCredential(room, gameId) {
  const credential = new Promise((resolveCredential, rejectCredential) => {
    const timer = setTimeout(() => rejectCredential(new Error("resume credential was not issued")), 10_000);
    room.onMessage("roomResumeCredential", (payload) => {
      if (payload?.gameId !== gameId || typeof payload.resumeCredential !== "string") return;
      clearTimeout(timer);
      resolveCredential(payload.resumeCredential);
    });
  });
  room.send("requestRoomResumeCredential", { gameId });
  return credential;
}

async function logicalReconnect(api, gameId, resumeCredential, owner) {
  return apiRequest(api, "/matchmake/reconnect", {
    gameId,
    resumeCredential,
    physicalRoomId: owner.physicalRoomId,
    ownerEpoch: owner.ownerEpoch,
  }, false);
}

async function apiRequest(api, path, body, admin = true) {
  const response = await fetch(api.url + path, {
    method: "POST",
    headers: {
      ...(admin ? { authorization: "Bearer " + adminToken } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const value = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(api.slot + " " + path + " returned " + response.status + ": " + JSON.stringify(value));
  return value;
}

function seatSnapshot(room, seat) {
  const player = room.state.players[seat];
  assert(player, "seat " + seat + " is missing from room " + room.roomId);
  return {
    matchId: room.state.matchId,
    phase: room.state.phase,
    turnCount: room.state.turnCount,
    turnSeat: room.state.turnSeat,
    ownHand: player.hand.map((card) => card.cardId),
    ownHandCount: player.hand.length,
    ownSecurityCount: player.security.length,
    ownDeckCount: player.deck.length,
    ownEggDeckCount: player.eggDeck.length,
  };
}

async function startLostReplyProxy(targetUrl) {
  const server = createServer((request, _response) => {
    void (async () => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const upstream = await fetch(targetUrl + request.url, {
        method: request.method,
        headers: {
          authorization: request.headers.authorization,
          "content-type": request.headers["content-type"],
        },
        body: Buffer.concat(chunks),
      });
      await upstream.arrayBuffer();
      request.socket.destroy();
    })().catch((error) => request.socket.destroy(error));
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("lost-reply proxy did not bind");
  return { server, url: "http://127.0.0.1:" + address.port };
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("could not allocate a local port");
  const port = address.port;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function waitFor(check, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError ?? new Error("condition did not become true within " + timeoutMs + "ms");
}

function docker(args) {
  const result = spawnSync("docker", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error("docker " + args.join(" ") + " failed: " + (result.stderr || result.stdout));
  return result.stdout.trim();
}

function stopProcess(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  child.kill(signal);
  return new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      resolveStop();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveStop();
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}
