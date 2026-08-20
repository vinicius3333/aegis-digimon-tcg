import { createServer } from "node:http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { ROOM_TYPE, ROOM_TYPE_BOT, ROOM_TYPE_PRIVATE, ROOM_TYPE_RANKED, ROOM_TYPE_TOURNAMENT } from "@aegis/shared";
import { AegisRoom, roomRegistry, roomCodeRegistry } from "./rooms/AegisRoom.js";
import "./cards/index.js"; // side-effect: registers every implemented card EffectModule
import { log, logError, flushLogs } from "./logger.js";
import { installAccountRoutes } from "./accounts/routes.js";
import {
  botSeatingStore,
  deadlineScheduler,
  driveBotMatches,
  eliminationStore,
  participantStore,
  seriesStore,
  swissProgram,
  topCutProgram,
} from "./tournaments/runtime.js";
import { drainForShutdown, startDeadlineWorker, type DeadlineWorker } from "./tournaments/scheduler/index.js";
import { accountStore } from "./accounts/runtime.js";
import {
  createDeploymentRuntime,
  installDeploymentRoutes,
  type DeploymentSlot,
} from "./deployment/runtime.js";
import { DeploymentServer } from "./deployment/DeploymentServer.js";
import { corsOriginForRequest } from "./http/cors.js";

const app = express();
app.use((req, res, next) => {
  const origin = corsOriginForRequest({
    requestOrigin: req.headers.origin,
    configuredOrigin: process.env.AEGIS_WEB_URL ?? "http://localhost:5173",
    production: process.env.NODE_ENV === "production",
  });
  if (origin !== undefined) res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));
app.use(express.json());
// The runtime singletons, not fresh instances: `TopCutProgram`'s in-process lock only serializes
// callers that SHARE the instance, and the routes, the resolution listener and the sweep are three
// callers of the same transition.
installAccountRoutes(app, accountStore, participantStore, seriesStore, swissProgram, eliminationStore, botSeatingStore, topCutProgram);

const configuredSlot = process.env.AEGIS_DEPLOYMENT_SLOT ?? "legacy";
if (!["blue", "green", "legacy"].includes(configuredSlot)) {
  throw new Error(`Invalid AEGIS_DEPLOYMENT_SLOT: ${configuredSlot}`);
}
const deploymentRuntime = createDeploymentRuntime({
  slot: configuredSlot as DeploymentSlot,
  revision: process.env.AEGIS_REVISION ?? "development",
  adminToken: process.env.AEGIS_DEPLOYMENT_ADMIN_TOKEN ?? "",
  acceptingNewRooms: process.env.AEGIS_DEPLOYMENT_START_DRAINING !== "true",
  activeRooms: () => roomRegistry.size,
  connectedClients: () => [...roomRegistry.values()].reduce((total, room) => total + room.clients.length, 0),
  readiness: () => accountStore.healthCheck(),
});
installDeploymentRoutes({ app, runtime: deploymentRuntime });

/**
 * POST /bot/join  { roomId: string }
 * Seats a bot in a dedicated bot room, or temporarily in a casual room for an
 * already-open legacy web bundle. The room must have exactly one human player.
 * Returns 404 if absent, 409 if ineligible, or 200 { ok: true } on success.
 */
app.post("/bot/join", (req, res) => {
  const { roomId } = req.body as { roomId?: string };
  if (!roomId) {
    log(`[BOT_JOIN] ${JSON.stringify({ status: 400, outcome: "room_id_required", slot: configuredSlot })}`);
    res.status(400).json({ error: "roomId required" });
    return;
  }
  const room = roomRegistry.get(roomId);
  if (!room) {
    log(`[BOT_JOIN] ${JSON.stringify({ roomId, status: 404, outcome: "room_not_found", slot: configuredSlot })}`);
    res.status(404).json({ error: "room not found" });
    return;
  }
  if (room.clients.length !== 1) {
    log(`[BOT_JOIN] ${JSON.stringify({ roomId, status: 409, outcome: "unexpected_client_count", clients: room.clients.length, slot: configuredSlot })}`);
    res.status(409).json({ error: "room must have exactly one human player" });
    return;
  }
  if (!room.addBot()) {
    log(`[BOT_JOIN] ${JSON.stringify({ roomId, status: 409, outcome: "room_ineligible", clients: room.clients.length, slot: configuredSlot })}`);
    res.status(409).json({ error: "bot is not allowed in this room" });
    return;
  }
  log(`[BOT_JOIN] ${JSON.stringify({ roomId, status: 200, outcome: "bot_joined", clients: room.clients.length, slot: configuredSlot })}`);
  res.json({ ok: true });
});

/**
 * POST /room/lookup  { roomCode: string }
 * Resolves a private room code to its Colyseus room ID so the client can
 * joinById. Returns 404 if the code is unknown or the room is full/gone.
 */
app.post("/room/lookup", (req, res) => {
  const { roomCode } = req.body as { roomCode?: string };
  if (!roomCode) {
    res.status(400).json({ error: "roomCode required" });
    return;
  }
  const roomId = roomCodeRegistry.get(roomCode.toUpperCase());
  if (!roomId) {
    res.status(404).json({ error: "room not found" });
    return;
  }
  const room = roomRegistry.get(roomId);
  if (!room || room.clients.length >= 2) {
    roomCodeRegistry.delete(roomCode.toUpperCase());
    res.status(404).json({ error: "room not available" });
    return;
  }
  res.json({ roomId });
});

const httpServer = createServer(app);
const gameServer = new DeploymentServer(deploymentRuntime, {
  transport: new WebSocketTransport({ server: httpServer }),
  // Aegis owns SIGTERM/SIGINT below so it can refuse a stop while rooms exist.
  gracefullyShutdown: false,
});
// Explicit false values are security boundaries: Colyseus merges handler options
// over client-supplied create options, so clients cannot promote another room type
// into bot mode by sending `{ botRoom: true }` themselves.
gameServer.define(ROOM_TYPE, AegisRoom, { botRoom: false });
gameServer.define(ROOM_TYPE_BOT, AegisRoom, { botRoom: true });
gameServer.define(ROOM_TYPE_RANKED, AegisRoom, { botRoom: false, rankedRoom: true });
// Filtered by BOTH tournament join keys: the legacy flow matches a room per bracket match, the
// program flow one per Tournament Game, and neither may ever land in the other's room.
gameServer.define(ROOM_TYPE_TOURNAMENT, AegisRoom, { botRoom: false, tournamentRoom: true }).filterBy(["tournamentMatchId", "tournamentGameId"]);
gameServer.define(ROOM_TYPE_PRIVATE, AegisRoom, { botRoom: false, private: true });

/**
 * The deadline worker runs in production by default and nowhere else by default, because a test or
 * a local session that boots the server should not have a background loop applying no-show
 * penalties to whatever happens to be in the database. `TOURNAMENT_SCHEDULER=on|off` overrides
 * either way. Running it on every production instance is intended: rows are leased, so instances
 * take disjoint work, and the commands are idempotent, so an overlap during blue/green applies
 * once regardless.
 */
const ON_VALUES = ["1", "true", "on"];
const OFF_VALUES = ["0", "false", "off"];
const configuredScheduler = (process.env.TOURNAMENT_SCHEDULER ?? "").trim().toLowerCase();
if (configuredScheduler !== "" && ![...ON_VALUES, ...OFF_VALUES].includes(configuredScheduler)) {
  // Refused rather than defaulted, exactly like AEGIS_DEPLOYMENT_SLOT above. Reading an
  // unrecognised value as "off" would let one typo silently disable every no-show, game loss and
  // match-loss deadline in production, and nothing would look wrong until a player complained.
  throw new Error(
    `Invalid TOURNAMENT_SCHEDULER: ${process.env.TOURNAMENT_SCHEDULER} (expected one of ${[...ON_VALUES, ...OFF_VALUES].join(", ")})`,
  );
}
const schedulerEnabled =
  configuredScheduler === "" ? process.env.NODE_ENV === "production" : ON_VALUES.includes(configuredScheduler);

/**
 * Every reconciliation pass the worker runs after the deadlines, chained so one failing does not
 * skip the others.
 *
 * Four of them today, and they answer different questions: `armPendingJoinLadders` asks whether a
 * published match still needs its attendance ladder queued, `sweepOpenTournaments` whether a
 * Swiss round can close, `sweepFrozenSwissPhases` whether a finished Swiss phase is still waiting
 * for its Top Cut, and `driveBotMatches` whether a bot is due in a room. All four are guarantees
 * rather than optimisations — the in-memory notifications that normally trigger them are lost to a
 * crash — so a pass that threw and took its siblings down with it would leave one whole format
 * stalled with nothing in the logs to say which.
 *
 * The Swiss pass runs before the Top Cut pass on purpose: closing the last round is what parks a
 * phase in `frozen`, and running them in this order cuts within the same tick instead of the next.
 */
async function runSweeps(now: number): Promise<number> {
  let total = 0;
  for (const [name, sweep] of [
    ["join_ladders", () => deadlineScheduler.armPendingJoinLadders(now)],
    ["swiss", () => swissProgram.sweepOpenTournaments(now)],
    ["top_cut", () => topCutProgram.sweepFrozenSwissPhases(now)],
    ["bots", () => driveBotMatches(now)],
  ] as const) {
    try {
      total += await sweep();
    } catch (error) {
      logError(`[TOURNAMENT_SWEEP] ${name} pass failed`, error);
    }
  }
  return total;
}
const deadlineWorker: DeadlineWorker | undefined = schedulerEnabled
  ? startDeadlineWorker({
      scheduler: deadlineScheduler,
      sweep: (now) => runSweeps(now),
    })
  : undefined;
log(`[aegis/api] tournament deadline worker ${deadlineWorker ? "started" : "disabled"} (slot ${configuredSlot})`);

const port = Number(process.env.PORT ?? 2567);
gameServer
  .listen(port)
    .then(() => log(`[aegis/api] Colyseus listening on :${port} (rooms "${ROOM_TYPE}" + "${ROOM_TYPE_PRIVATE}")`))
  .catch((err: unknown) => {
    logError("[aegis/api] failed to start:", err);
    process.exit(1);
  });

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  const { activeRooms } = deploymentRuntime.status();
  if (process.env.NODE_ENV === "production" && activeRooms > 0) {
    logError(`[aegis/api] ${signal} refused — ${activeRooms} active room(s) still owned by this slot`);
    return;
  }
  shuttingDown = true;
  log(`[aegis/api] ${signal} received — shutting down gracefully`);
  // Close the HTTP server immediately so the port is freed before node --watch
  // spawns the next instance, avoiding EADDRINUSE on fast restarts.
  httpServer.close();
  // Worker first, then rooms. The ordering — and why it may not be swapped — lives in
  // `drainForShutdown`, where it is unit-tested; this call site only supplies the two steps.
  void drainForShutdown({
    stopDeadlineWorker: () => deadlineWorker?.stop(),
    shutdownRooms: () => gameServer.gracefullyShutdown(false),
  })
    .then(() => flushLogs())
    .finally(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// The buffered log stream is flushed before exiting: a crash line written and then dropped by
// an immediate `process.exit` is the one line that always matters.
const exitAfterFlush = () => void flushLogs().finally(() => process.exit(1));
process.on("uncaughtException", (err) => {
  logError("[aegis/api] uncaught exception:", err);
  exitAfterFlush();
});
process.on("unhandledRejection", (reason) => {
  logError("[aegis/api] unhandled rejection:", reason);
  exitAfterFlush();
});
