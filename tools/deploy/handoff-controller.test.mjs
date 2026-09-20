import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  HANDOFF_ACTIONS,
  assertHandoffCleanupSafe,
  createHandoffAdminPort,
  createJsonHandoffStore,
  runHandoffController,
} from "./handoff-controller.mjs";

const roomSet = [
  { roomId: "room-1", sessionId: "session-1", ownerEpoch: 8, compatible: true },
  { roomId: "room-2", sessionId: "session-2", ownerEpoch: 4, compatible: true },
  { roomId: "room-3", sessionId: "session-3", ownerEpoch: 1, compatible: true },
  { roomId: "room-4", sessionId: "session-4", ownerEpoch: 3, compatible: true },
  { roomId: "room-5", sessionId: "session-5", ownerEpoch: 2, compatible: true },
];

function memoryStore() {
  const records = new Map();
  return {
    records,
    async load(id) {
      return structuredClone(records.get(id));
    },
    async save(record) {
      records.set(record.migrationId, structuredClone(record));
    },
    async list() {
      return [...records.values()].map((record) => structuredClone(record));
    },
  };
}

function adminPort(overrides = {}) {
  return {
    checkCompatibility: async () => ({ compatible: true, rooms: roomSet, blockers: [] }),
    destinationReadiness: async () => ({ ready: true, acceptingNewRooms: false, authoritativeRooms: 0 }),
    prepare: async ({ transferId, room }) => ({
      transferId,
      status: "destination_validated",
      fromOwnerEpoch: room.ownerEpoch,
    }),
    migrate: async ({ expectedOwnerEpoch }) => ({ status: "completed", ownerEpoch: expectedOwnerEpoch + 1 }),
    progress: async ({ transfer }) => ({ status: transfer.status, ownerEpoch: transfer.ownerEpoch }),
    abort: async () => ({ status: "aborted" }),
    reconcile: async ({ transfer }) => ({ status: transfer.status, ownerEpoch: transfer.ownerEpoch }),
    cleanupSafety: async () => ({
      ownershipVerified: true,
      authoritativeRooms: 0,
      inFlightTransfers: 0,
      pendingTasks: 0,
    }),
    ...overrides,
  };
}

async function prepareAll({ store, admin = adminPort(), migrationId = "migration-1" } = {}) {
  const request = { migrationId, sourceSlot: "blue", destinationSlot: "green", store, admin };
  await runHandoffController({ ...request, mode: "check" });
  return runHandoffController({ ...request, mode: "prepare" });
}

test("the controller exposes separate safe operator modes without changing deploy-web", () => {
  assert.deepEqual(HANDOFF_ACTIONS, {
    "handoff-check": "check",
    "handoff-prepare": "prepare",
    "handoff-migrate": "migrate",
    "handoff-promote": "promote",
    "handoff-progress": "progress",
    "handoff-abort": "abort",
    "handoff-reconcile": "reconcile",
  });
});

test("the Docker admin adapter does not infer authoritative ownership from ordinary room counts", async () => {
  const adapter = createHandoffAdminPort({
    request: async () => ({}),
    statuses: async () => [1, 2, 3].map(() => ({ slot: "green", activeRooms: 0, acceptingNewRooms: false })),
    readiness: async () => [1, 2, 3].map(() => ({ slot: "green", status: "ready" })),
  });

  const report = await adapter.destinationReadiness({ slot: "green" });
  assert.deepEqual(report, { ready: true, acceptingNewRooms: false, authoritativeRooms: undefined });
  assert.throws(
    () =>
      assertHandoffCleanupSafe(
        {
          slot: "green",
          ownershipVerified: true,
          authoritativeRooms: report.authoritativeRooms,
          inFlightTransfers: 0,
          pendingTasks: 0,
        },
        "green",
      ),
    /unverifiable/i,
  );
});

test("the admin adapter reserves on target, validates, switches ownership, activates, then disposes source", async () => {
  const calls = [];
  const adapter = createHandoffAdminPort({
    request: async (slot, path, method, body) => {
      calls.push({ slot, path, method, body });
      if (path.endsWith("/authorize-destination")) return { sourceAuthorization: "signed-source-descriptor" };
      if (path.endsWith("/migrate")) return { ownerEpoch: 4 };
      if (path.endsWith("/activate")) return { transferId: "transfer-12345678", status: "completed", toOwnerEpoch: 4 };
      if (path.endsWith("/validate")) return { transferId: "transfer-12345678", status: "destination_validated", fromOwnerEpoch: 3 };
      return { transferId: "transfer-12345678", status: "snapshot_saved", fromOwnerEpoch: 3 };
    },
    statuses: async () => [],
    readiness: async () => [],
  });
  const input = {
    migrationId: "migration-adapter",
    transferId: "transfer-12345678",
    sourceSlot: "blue",
    destinationSlot: "green",
    room: { roomId: "room-1", sessionId: "session-1", ownerEpoch: 3 },
    executionVersion: "engine-v1",
    rulesVersion: "rules-v1",
    sourceRevision: "rev-a",
  };

  const prepared = await adapter.prepare(input);
  assert.equal(prepared.status, "destination_validated");
  assert.deepEqual(calls.slice(0, 4).map(({ slot, path }) => [slot, path]), [
    ["blue", "/deployment/handoff/authorize-destination"],
    ["green", "/deployment/handoff/destinations/reserve"],
    ["blue", "/deployment/handoff/prepare"],
    ["green", "/deployment/handoff/transfers/transfer-12345678/validate"],
  ]);
  assert.equal(calls[1].body.sourceAuthorization, "signed-source-descriptor");

  calls.length = 0;
  const migrated = await adapter.migrate(input);
  assert.equal(migrated.status, "completed");
  assert.deepEqual(calls.map(({ slot, path }) => [slot, path]), [
    ["blue", "/deployment/handoff/transfers/transfer-12345678/migrate"],
    ["green", "/deployment/handoff/transfers/transfer-12345678/activate"],
    ["blue", "/deployment/handoff/transfers/transfer-12345678/complete"],
  ]);
});

test("compatibility blockers persist the check and prevent preparation", async () => {
  const store = memoryStore();
  const prepare = async () => assert.fail("blocked rooms must not be prepared");
  const admin = adminPort({
    checkCompatibility: async () => ({
      compatible: false,
      rooms: [{ roomId: "room-old-frame", sessionId: "session-old-frame", ownerEpoch: 4, compatible: false, reason: "unsupported-frame" }],
      blockers: ["room-old-frame"],
    }),
    prepare,
  });

  const report = await runHandoffController({
    mode: "check",
    migrationId: "migration-blocked",
    sourceSlot: "blue",
    destinationSlot: "green",
    store,
    admin,
  });
  assert.equal(report.status, "incompatible");
  assert.deepEqual(report.blockers, ["room-old-frame"]);
  assert.equal((await store.load("migration-blocked")).status, "incompatible");
});

test("preparation requires idle destination readiness and persists idempotent transfer IDs", async () => {
  const store = memoryStore();
  const calls = [];
  const admin = adminPort({
    prepare: async (input) => {
      calls.push(input.room.roomId);
      return { transferId: input.transferId, status: "destination_validated", fromOwnerEpoch: input.room.ownerEpoch };
    },
  });
  await prepareAll({ store, admin, migrationId: "migration-prepare" });
  const record = await store.load("migration-prepare");

  assert.deepEqual(
    calls,
    roomSet.map(({ roomId }) => roomId),
  );
  assert.equal(record.status, "destination_validated");
  assert.ok(record.transfers.every(({ transferId }) => typeof transferId === "string" && transferId.length >= 8));
  assert.equal(new Set(record.transfers.map(({ transferId }) => transferId)).size, roomSet.length);

  const notReadyStore = memoryStore();
  const notReadyAdmin = adminPort({
    destinationReadiness: async () => ({ ready: true, acceptingNewRooms: true, authoritativeRooms: 1 }),
    prepare: async () => assert.fail("a competing destination must not be prepared"),
  });
  await runHandoffController({
    mode: "check",
    migrationId: "migration-not-ready",
    sourceSlot: "blue",
    destinationSlot: "green",
    store: notReadyStore,
    admin: notReadyAdmin,
  });
  await assert.rejects(
    runHandoffController({
      mode: "prepare",
      migrationId: "migration-not-ready",
      sourceSlot: "blue",
      destinationSlot: "green",
      store: notReadyStore,
      admin: notReadyAdmin,
    }),
    /destination is not ready and idle/i,
  );
});

test("migration holds after the canary and explicit promotions never exceed bounded concurrency", async () => {
  const store = memoryStore();
  const events = [];
  let inFlight = 0;
  let highestConcurrency = 0;
  const admin = adminPort({
    migrate: async ({ roomId, expectedOwnerEpoch }) => {
      inFlight++;
      highestConcurrency = Math.max(highestConcurrency, inFlight);
      events.push(`start:${roomId}`);
      await new Promise((resolve) => setTimeout(resolve, 4));
      events.push(`done:${roomId}`);
      inFlight--;
      return { status: "completed", ownerEpoch: expectedOwnerEpoch + 1 };
    },
  });
  await prepareAll({ store, admin, migrationId: "migration-batches" });

  const result = await runHandoffController({
    mode: "migrate",
    migrationId: "migration-batches",
    sourceSlot: "blue",
    destinationSlot: "green",
    store,
    admin,
    canaryCount: 1,
    batchSize: 2,
    concurrencyLimit: 2,
  });

  assert.deepEqual(events.slice(0, 2), ["start:room-1", "done:room-1"]);
  assert.equal(events.filter((event) => event.startsWith("done:")).length, 1);
  assert.equal(result.status, "awaiting_promotion");
  const firstPromotion = await runHandoffController({
    mode: "promote", migrationId: "migration-batches", sourceSlot: "blue", destinationSlot: "green", store, admin,
    canaryCount: 1, batchSize: 2, concurrencyLimit: 2,
  });
  assert.ok(events.indexOf("done:room-1") < events.indexOf("start:room-2"));
  assert.equal(firstPromotion.status, "awaiting_promotion");
  const finalPromotion = await runHandoffController({
    mode: "promote", migrationId: "migration-batches", sourceSlot: "blue", destinationSlot: "green", store, admin,
    canaryCount: 1, batchSize: 2, concurrencyLimit: 2,
  });
  assert.equal(finalPromotion.status, "completed");
  assert.equal(highestConcurrency, 2);
  assert.equal(events.filter((event) => event.startsWith("done:")).length, 5);
});

test("an incomplete canary stops later batches until progress or reconciliation", async () => {
  const store = memoryStore();
  const started = [];
  const admin = adminPort({
    migrate: async ({ roomId, expectedOwnerEpoch }) => {
      started.push(roomId);
      return roomId === "room-1"
        ? { status: "owner_switched", ownerEpoch: expectedOwnerEpoch + 1 }
        : { status: "completed", ownerEpoch: expectedOwnerEpoch + 1 };
    },
  });
  await prepareAll({ store, admin, migrationId: "migration-canary" });

  const result = await runHandoffController({
    mode: "migrate",
    migrationId: "migration-canary",
    sourceSlot: "blue",
    destinationSlot: "green",
    store,
    admin,
    canaryCount: 1,
    batchSize: 4,
    concurrencyLimit: 4,
  });

  assert.deepEqual(started, ["room-1"]);
  assert.equal(result.status, "needs_reconcile");
  assert.equal(result.transfers.filter(({ status }) => status === "destination_validated").length, 4);
  await assert.rejects(
    runHandoffController({
      mode: "migrate",
      migrationId: "migration-canary",
      sourceSlot: "blue",
      destinationSlot: "green",
      store,
      admin,
      canaryCount: 1,
      batchSize: 4,
      concurrencyLimit: 4,
    }),
    /needs_reconcile/i,
  );
  assert.deepEqual(started, ["room-1"]);
});

test("abort is allowed before ownership changes but refuses after reconciliation sees a committed owner switch", async () => {
  const store = memoryStore();
  let switched = false;
  const aborts = [];
  const admin = adminPort({
    abort: async ({ transferId }) => {
      aborts.push(transferId);
      return { status: "aborted" };
    },
    reconcile: async () => ({ status: switched ? "owner_switched" : "destination_validated", ownerEpoch: switched ? 9 : 8 }),
  });
  await prepareAll({ store, admin, migrationId: "migration-abort" });

  const aborted = await runHandoffController({
    mode: "abort",
    migrationId: "migration-abort",
    store,
    admin,
  });
  assert.equal(aborted.status, "aborted");
  assert.equal(aborts.length, roomSet.length);

  await prepareAll({ store, admin, migrationId: "migration-switched" });
  switched = true;
  const abortCount = aborts.length;
  await assert.rejects(
    runHandoffController({ mode: "abort", migrationId: "migration-switched", store, admin }),
    /owner already switched/i,
  );
  assert.equal(aborts.length, abortCount);
  assert.equal((await store.load("migration-switched")).status, "owner_switched");
});

test("progress and reconcile refresh persisted transfer states after a controller restart", async () => {
  const store = memoryStore();
  let authoritativeStatus = "owner_switched";
  const admin = adminPort({
    progress: async () => ({ status: "destination_validated", ownerEpoch: 10 }),
    reconcile: async () => ({ status: authoritativeStatus, ownerEpoch: 11 }),
  });
  await prepareAll({ store, admin, migrationId: "migration-restart" });
  const record = await store.load("migration-restart");
  record.status = "needs_reconcile";
  record.transfers[0].status = "owner_switched";
  record.transfers[0].ownerEpoch = 9;
  await store.save(record);

  const progress = await runHandoffController({ mode: "progress", migrationId: "migration-restart", store, admin });
  assert.equal(progress.transfers[0].status, "destination_validated");
  const reconciled = await runHandoffController({
    mode: "reconcile",
    migrationId: "migration-restart",
    store,
    admin,
  });
  assert.equal(reconciled.transfers[0].status, "owner_switched");
  assert.equal(reconciled.status, "owner_switched");

  authoritativeStatus = "completed";
  const completed = await runHandoffController({
    mode: "reconcile",
    migrationId: "migration-restart",
    store,
    admin,
  });
  assert.equal(completed.status, "completed");
});

test("a lost owner-switch response is reconciled after restart and cannot trigger a duplicate migration", async (t) => {
  const directory = mkdtempSync(`${tmpdir()}/aegis-handoff-lost-response-`);
  t.after(() => rmSync(directory, { recursive: true }));
  const storePath = `${directory}/handoff-state.json`;
  const migrationId = "migration-lost-response";
  let remoteStatus = "destination_validated";
  let migrateCalls = 0;
  const admin = adminPort({
    checkCompatibility: async () => ({
      compatible: true,
      rooms: [{ roomId: "room-after-deploy", sessionId: "session-after-deploy", ownerEpoch: 8, compatible: true }],
    }),
    prepare: async ({ transferId, room }) => ({ transferId, status: "destination_validated", fromOwnerEpoch: room.ownerEpoch }),
    migrate: async () => {
      migrateCalls++;
      remoteStatus = "owner_switched";
      throw Object.assign(new Error("response disappeared"), { code: "connection_lost" });
    },
    reconcile: async () => ({ status: remoteStatus, ownerEpoch: remoteStatus === "owner_switched" ? 9 : 8 }),
  });

  const firstController = createJsonHandoffStore(storePath);
  const options = { migrationId, sourceSlot: "blue", destinationSlot: "green", admin };
  await runHandoffController({ ...options, mode: "check", store: firstController });
  await runHandoffController({ ...options, mode: "prepare", store: firstController });
  const uncertain = await runHandoffController({ ...options, mode: "migrate", store: firstController });

  assert.equal(uncertain.status, "needs_reconcile");
  assert.equal(migrateCalls, 1);
  await assert.rejects(
    runHandoffController({ ...options, mode: "migrate", store: firstController }),
    /needs_reconcile/i,
  );
  assert.equal(migrateCalls, 1);

  const restartedController = createJsonHandoffStore(storePath);
  const reconciled = await runHandoffController({ ...options, mode: "reconcile", store: restartedController });
  assert.equal(reconciled.status, "owner_switched");
  assert.equal(reconciled.transfers[0].ownerEpoch, 9);
  await assert.rejects(
    runHandoffController({ ...options, mode: "migrate", store: restartedController }),
    /explicit handoff-promote/i,
  );
  assert.equal(migrateCalls, 1);
});

test("cleanup requires authoritative proof that rooms, transfers, and tasks are all gone", async () => {
  const safe = {
    slot: "blue",
    ownershipVerified: true,
    authoritativeRooms: 0,
    inFlightTransfers: 0,
    pendingTasks: 0,
  };
  assert.doesNotThrow(() => assertHandoffCleanupSafe(safe, "blue"));
  assert.throws(() => assertHandoffCleanupSafe({ ...safe, ownershipVerified: false }, "blue"), /not verified/i);
  assert.throws(() => assertHandoffCleanupSafe({ ...safe, authoritativeRooms: 1 }, "blue"), /still owns rooms/i);
  assert.throws(() => assertHandoffCleanupSafe({ ...safe, inFlightTransfers: 1 }, "blue"), /transfer/i);
  assert.throws(() => assertHandoffCleanupSafe({ ...safe, pendingTasks: 1 }, "blue"), /tasks/i);
  assert.throws(() => assertHandoffCleanupSafe({ ...safe, pendingTasks: undefined }, "blue"), /unverifiable/i);
});

test("the JSON store atomically preserves controller state without tokens or snapshots", async (t) => {
  const directory = mkdtempSync(`${tmpdir()}/aegis-handoff-store-`);
  t.after(() => rmSync(directory, { recursive: true }));
  const store = createJsonHandoffStore(`${directory}/handoff-state.json`);
  const record = {
    schemaVersion: 1,
    migrationId: "migration-private-room",
    sourceSlot: "blue",
    destinationSlot: "green",
    status: "destination_validated",
    blockers: [],
    transfers: [
      { roomId: "room-1", sessionId: "session-1", transferId: "migration-private-room:room-1", status: "destination_validated", sourceOwnerEpoch: 2 },
    ],
    updatedAt: "2026-09-20T12:00:00.000Z",
  };
  await store.save(record);

  assert.deepEqual(await store.load(record.migrationId), record);
  assert.deepEqual(await store.list(), [record]);
  const saved = readFileSync(`${directory}/handoff-state.json`, "utf8");
  assert.doesNotMatch(saved, /reconnectionToken|snapshot|deck|token/i);
});

test("controller timing reports aggregate operation metrics without room or transfer identifiers", async () => {
  const metrics = [];
  let tick = 0;
  const report = await runHandoffController({
    mode: "check",
    migrationId: "migration-metrics",
    sourceSlot: "blue",
    destinationSlot: "green",
    store: memoryStore(),
    admin: adminPort(),
    monotonicNow: () => (tick += 5),
    onMetrics: (value) => metrics.push(value),
  });

  assert.equal(report.status, "compatible");
  assert.deepEqual(metrics, [
    {
      operation: "check",
      elapsedMs: 15,
      adminCallCount: 1,
      adminFailureCount: 0,
      adminDurationMs: 5,
    },
  ]);
  assert.doesNotMatch(JSON.stringify(metrics), /room-|migration-metrics|transfer|token|snapshot/i);
});
