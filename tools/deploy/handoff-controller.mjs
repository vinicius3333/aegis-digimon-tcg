import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isDeploymentSlot } from "./shared.mjs";

export const HANDOFF_ACTIONS = Object.freeze({
  "handoff-check": "check",
  "handoff-prepare": "prepare",
  "handoff-migrate": "migrate",
  "handoff-promote": "promote",
  "handoff-progress": "progress",
  "handoff-abort": "abort",
  "handoff-reconcile": "reconcile",
});

const TRANSFER_STATUSES = new Set([
  "pending",
  "preparing",
  "frozen",
  "snapshot_saved",
  "destination_validated",
  "owner_switched",
  "destination_active",
  "completed",
  "aborted",
]);
const TERMINAL_STATUSES = new Set(["completed", "aborted"]);
const OWNER_SWITCHED_STATUSES = new Set(["owner_switched", "destination_active", "completed"]);
const MIGRATION_STATUSES = new Set([
  "compatible",
  "incompatible",
  "destination_validated",
  "preparing",
  "preparation_incomplete",
  "migrating",
  "partially_switched",
  "owner_switched",
  "completed",
  "aborted",
  "needs_reconcile",
  "awaiting_promotion",
]);

/**
 * Local deploy-controller state machine. Admin operations are explicit ports so
 * the rollout can be proved with fakes until API/gateway handoff endpoints exist.
 */
export async function runHandoffController(options) {
  if (typeof options?.onMetrics !== "function") return runHandoffControllerCore(options);

  const mode = options?.mode;
  const operation = new Set(["check", "prepare", "migrate", "promote", "progress", "abort", "reconcile", "cleanup-check"]).has(
    mode,
  )
    ? mode
    : "unknown";
  const readClock = () => {
    try {
      const value = options?.monotonicNow?.() ?? performance.now();
      return Number.isFinite(value) ? value : performance.now();
    } catch {
      return performance.now();
    }
  };
  const metrics = { adminCallCount: 0, adminFailureCount: 0, adminDurationMs: 0 };
  const admin = {};
  for (const [name, method] of Object.entries(options?.admin ?? {})) {
    if (typeof method !== "function") continue;
    admin[name] = async (...args) => {
      metrics.adminCallCount++;
      const startedAt = readClock();
      try {
        return await method.apply(options.admin, args);
      } catch (error) {
        metrics.adminFailureCount++;
        throw error;
      } finally {
        metrics.adminDurationMs += Math.max(0, readClock() - startedAt);
      }
    };
  }

  const startedAt = readClock();
  try {
    return await runHandoffControllerCore({ ...options, admin });
  } finally {
    const report = {
      operation,
      elapsedMs: Math.max(0, readClock() - startedAt),
      adminCallCount: metrics.adminCallCount,
      adminFailureCount: metrics.adminFailureCount,
      adminDurationMs: metrics.adminDurationMs,
    };
    try {
      options.onMetrics(report);
    } catch {
      // Optional observability must not change handoff outcomes.
    }
  }
}

async function runHandoffControllerCore({
  mode,
  migrationId,
  sourceSlot,
  destinationSlot,
  store,
  admin,
  canaryCount = 1,
  batchSize = 10,
  concurrencyLimit = 2,
  now = () => new Date().toISOString(),
}) {
  assertMode(mode);
  if (!store || !admin) throw new Error("Handoff controller requires state and admin ports");

  if (mode === "check") {
    assertMigrationInputs({ migrationId, sourceSlot, destinationSlot });
    if (await store.load(migrationId)) throw new Error("migrationId already exists; use progress or reconcile instead");
    const report = await admin.checkCompatibility({ migrationId, sourceSlot, destinationSlot });
    const rooms = validateCompatibilityReport(report);
    const compatible = report.compatible === true && rooms.every((room) => room.compatible);
    const state = {
      schemaVersion: 1,
      migrationId,
      sourceSlot,
      destinationSlot,
      status: compatible ? "compatible" : "incompatible",
      blockers: sanitizeBlockers(report.blockers, rooms),
      executionVersion: report.executionVersion,
      rulesVersion: report.rulesVersion,
      sourceRevision: report.sourceRevision,
      transfers: rooms.map(({ roomId, sessionId, ownerEpoch }) => ({
        roomId,
        sessionId,
        transferId: createMigrationId(),
        sourceOwnerEpoch: ownerEpoch,
        status: "pending",
      })),
      updatedAt: now(),
    };
    await store.save(state);
    return state;
  }

  if (mode === "cleanup-check") {
    if (!isDeploymentSlot(sourceSlot)) throw new Error("A valid slot is required for cleanup check");
    const report = await admin.cleanupSafety({ slot: sourceSlot });
    assertHandoffCleanupSafe(report, sourceSlot);
    return report;
  }

  if (!isSafeOpaqueId(migrationId)) {
    throw new Error("A valid migrationId is required");
  }
  const state = await store.load(migrationId);
  if (!state) throw new Error(`No persisted handoff state for ${migrationId}`);
  validatePersistedState(state, migrationId);

  if (mode === "prepare") return prepareTransfers({ state, store, admin, now });
  if (mode === "migrate" || mode === "promote") {
    assertPositiveInteger(canaryCount, "canaryCount", 100);
    assertPositiveInteger(batchSize, "batchSize", 500);
    assertPositiveInteger(concurrencyLimit, "concurrencyLimit", 32);
    return migrateTransfers({
      state,
      store,
      admin,
      canaryCount,
      batchSize,
      concurrencyLimit,
      promote: mode === "promote",
      now,
    });
  }
  if (mode === "progress") return updateTransferProgress({ state, store, admin, operation: "progress", now });
  if (mode === "reconcile") return updateTransferProgress({ state, store, admin, operation: "reconcile", now });
  if (mode === "abort") return abortTransfers({ state, store, admin, now });
  throw new Error(`Unsupported handoff mode: ${mode}`);
}

export function assertHandoffCleanupSafe(report, slot) {
  const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
  if (!report || report.ownershipVerified !== true) {
    throw new Error(`${slot} authoritative ownership is not verified; refusing cleanup`);
  }
  if (report.slot !== slot) throw new Error(`${slot} authoritative ownership report names a different slot`);
  if (!isCount(report.authoritativeRooms) || !isCount(report.inFlightTransfers) || !isCount(report.pendingTasks)) {
    throw new Error(`${slot} handoff ownership/tasks are unverifiable; refusing cleanup`);
  }
  if (report.authoritativeRooms !== 0) throw new Error(`${slot} still owns rooms; refusing cleanup`);
  if (report.inFlightTransfers !== 0) throw new Error(`${slot} still has in-flight transfers; refusing cleanup`);
  if (report.pendingTasks !== 0) throw new Error(`${slot} still has pending handoff tasks; refusing cleanup`);
  return true;
}

/** Atomic local journal; it stores transfer IDs and progress only, never credentials or snapshots. */
export function createJsonHandoffStore(path) {
  const read = () => {
    if (!existsSync(path)) return { schemaVersion: 1, migrations: {} };
    let value;
    try {
      value = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      throw new Error("Persisted handoff controller state is unreadable; refusing to continue");
    }
    if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.migrations)) {
      throw new Error("Persisted handoff controller state is invalid; refusing to continue");
    }
    for (const [migrationId, record] of Object.entries(value.migrations)) {
      try {
        validatePersistedState(record, migrationId);
      } catch {
        throw new Error("Persisted handoff controller state is invalid; refusing to continue");
      }
    }
    return value;
  };

  return {
    async load(migrationId) {
      const entry = read().migrations[migrationId];
      return entry ? structuredClone(entry) : undefined;
    },
    async save(state) {
      validatePersistedState(state, state?.migrationId);
      const value = read();
      value.migrations[state.migrationId] = structuredClone(state);
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
      renameSync(temporary, path);
    },
    async list() {
      return Object.values(read().migrations).map((entry) => structuredClone(entry));
    },
    async hasTransferForSlot(slot) {
      return Object.values(read().migrations).some(
        (entry) =>
          (entry.sourceSlot === slot || entry.destinationSlot === slot) &&
          !["aborted", "compatible", "incompatible"].includes(entry.status) &&
          entry.transfers?.length > 0,
      );
    },
  };
}

async function prepareTransfers({ state, store, admin, now }) {
  if (state.status !== "compatible" && state.status !== "preparing" && state.status !== "preparation_incomplete") {
    throw new Error(`Cannot prepare handoff in ${state.status} state`);
  }
  const readiness = await admin.destinationReadiness({ slot: state.destinationSlot });
  assertDestinationReady(readiness, state.destinationSlot);
  state.status = "preparing";
  state.updatedAt = now();
  await store.save(state);

  const serialPersist = createSerialPersist(state, store, now);
  const candidates = state.transfers.filter((transfer) => transfer.status === "pending");
  const results = await mapLimit(candidates, 2, async (transfer) => {
    try {
      const prepared = await admin.prepare({
        migrationId: state.migrationId,
        transferId: transfer.transferId,
        sourceSlot: state.sourceSlot,
        destinationSlot: state.destinationSlot,
        room: {
          roomId: transfer.roomId,
          sessionId: transfer.sessionId,
          ownerEpoch: transfer.sourceOwnerEpoch,
        },
        executionVersion: state.executionVersion,
        rulesVersion: state.rulesVersion,
        sourceRevision: state.sourceRevision,
      });
      assertTransferResponse(prepared);
      transfer.status = normalizeTransferStatus(prepared.status);
      if (OWNER_SWITCHED_STATUSES.has(transfer.status)) {
        updateTransferFromAdmin(transfer, prepared, now());
        await serialPersist();
        return false;
      }
      if (transfer.status !== "destination_validated")
        throw new Error(`Transfer endpoint returned ${transfer.status}, expected destination_validated`);
      if (prepared.fromOwnerEpoch !== transfer.sourceOwnerEpoch) {
        throw new Error("Prepared transfer did not match the checked source owner epoch");
      }
      delete transfer.errorCode;
      transfer.updatedAt = now();
      await serialPersist();
      return transfer.status === "destination_validated";
    } catch (error) {
      transfer.errorCode = safeErrorCode(error);
      transfer.updatedAt = now();
      await serialPersist();
      return false;
    }
  });

  if (results.some((prepared) => !prepared)) {
    state.status = "preparation_incomplete";
    state.updatedAt = now();
    await serialPersist();
    throw new Error("One or more rooms could not be prepared; reconcile before retrying or aborting");
  }
  state.status = "destination_validated";
  state.updatedAt = now();
  await serialPersist();
  return state;
}

async function migrateTransfers({ state, store, admin, canaryCount, batchSize, concurrencyLimit, promote, now }) {
  const canMigrate = new Set(["destination_validated", "awaiting_promotion", "migrating", "partially_switched", "owner_switched", "needs_reconcile"]);
  if (!canMigrate.has(state.status) || (promote && !["awaiting_promotion", "partially_switched"].includes(state.status))) {
    throw new Error(`Cannot migrate handoff in ${state.status} state`);
  }
  if (state.status === "needs_reconcile") throw new Error("needs_reconcile before another migration batch");
  if (!promote && state.status !== "destination_validated") {
    throw new Error("Additional batches require the explicit handoff-promote command");
  }
  if (
    state.transfers.some(
      (transfer) =>
        transfer.errorCode ||
        ["preparing", "frozen", "snapshot_saved", "owner_switched", "destination_active", "aborted"].includes(transfer.status),
    )
  ) {
    throw new Error("In-flight or unresolved transfers must be reconciled before another migration batch");
  }
  const readiness = await admin.destinationReadiness({ slot: state.destinationSlot });
  assertDestinationReady(readiness, state.destinationSlot, { allowAuthoritativeRooms: state.status !== "destination_validated" });
  state.status = "migrating";
  state.updatedAt = now();
  await store.save(state);

  const pending = state.transfers.filter((transfer) => transfer.status === "destination_validated");
  const serialPersist = createSerialPersist(state, store, now);
  if (pending.length === 0) {
    state.status = state.transfers.length === 0 ? "completed" : deriveMigrationStatus(state.transfers);
    state.updatedAt = now();
    await serialPersist();
    return state;
  }

  const batch = pending.slice(0, promote ? batchSize : canaryCount);
  if (promote && state.canaryTransferIds?.some((id) => state.transfers.find((transfer) => transfer.transferId === id)?.status !== "completed")) {
    throw new Error("Canary transfers must be reconciled to completed before promotion");
  }
  if (!promote) state.canaryTransferIds = batch.map(({ transferId }) => transferId);
  const errors = await mapLimit(batch, concurrencyLimit, async (transfer) => {
      try {
        const result = await admin.migrate({
          migrationId: state.migrationId,
          sourceSlot: state.sourceSlot,
          destinationSlot: state.destinationSlot,
          transferId: transfer.transferId,
          roomId: transfer.roomId,
          expectedOwnerEpoch: transfer.sourceOwnerEpoch,
        });
        updateTransferFromAdmin(transfer, result, now());
        await serialPersist();
        return undefined;
      } catch (error) {
        transfer.errorCode = safeErrorCode(error);
        transfer.updatedAt = now();
        await serialPersist();
        return error;
      }
  });
  if (errors.some(Boolean) || batch.some((transfer) => transfer.status !== "completed")) {
    state.status = "needs_reconcile";
    state.lastPausedAfterBatch = (state.lastPausedAfterBatch ?? 0) + 1;
    state.updatedAt = now();
    await serialPersist();
    return state;
  }
  state.lastPausedAfterBatch = (state.lastPausedAfterBatch ?? 0) + 1;
  state.status = state.transfers.length > 0 && state.transfers.every((transfer) => transfer.status === "completed")
    ? "completed"
    : "awaiting_promotion";
  state.updatedAt = now();
  await serialPersist();
  return state;
}

async function updateTransferProgress({ state, store, admin, operation, now }) {
  const serialPersist = createSerialPersist(state, store, now);
  const candidates = state.transfers.filter(
    (transfer) => !TERMINAL_STATUSES.has(transfer.status) && (transfer.transferId || transfer.status !== "pending"),
  );
  await mapLimit(candidates, 4, async (transfer) => {
    if (!transfer.transferId) {
      transfer.errorCode = "transfer-id-missing";
      await serialPersist();
      return;
    }
    try {
      const response = await admin[operation]({
        migrationId: state.migrationId,
        transferId: transfer.transferId,
        sourceSlot: state.sourceSlot,
        destinationSlot: state.destinationSlot,
        roomId: transfer.roomId,
      });
      updateTransferFromAdmin(transfer, response, now());
      delete transfer.errorCode;
    } catch (error) {
      transfer.errorCode = safeErrorCode(error);
    }
    await serialPersist();
  });
  state.status = deriveMigrationStatus(state.transfers);
  state.updatedAt = now();
  await serialPersist();
  return state;
}

async function abortTransfers({ state, store, admin, now }) {
  const reconciled = await updateTransferProgress({ state, store, admin, operation: "reconcile", now });
  if (reconciled.transfers.some((transfer) => transfer.errorCode && !transfer.transferId)) {
    throw new Error("Cannot safely abort a transfer with unknown prepare outcome; retry preparation or reconcile");
  }
  if (reconciled.transfers.some((transfer) => transfer.errorCode)) {
    throw new Error("Cannot safely abort while a transfer cannot be authoritatively reconciled");
  }
  if (reconciled.transfers.some((transfer) => OWNER_SWITCHED_STATUSES.has(transfer.status))) {
    state.status = deriveMigrationStatus(state.transfers);
    await store.save(state);
    throw new Error("Cannot abort handoff after an owner already switched; reconcile the current owner");
  }

  for (const transfer of state.transfers) {
    if (TERMINAL_STATUSES.has(transfer.status)) continue;
    if (!transfer.transferId) continue;
    try {
      const response = await admin.abort({
        migrationId: state.migrationId,
        transferId: transfer.transferId,
        sourceSlot: state.sourceSlot,
        destinationSlot: state.destinationSlot,
        roomId: transfer.roomId,
        expectedOwnerEpoch: transfer.sourceOwnerEpoch,
      });
      updateTransferFromAdmin(transfer, response, now());
      await store.save(state);
      if (OWNER_SWITCHED_STATUSES.has(transfer.status)) {
        state.status = deriveMigrationStatus(state.transfers);
        await store.save(state);
        throw new Error("Owner switched while aborting; handoff outcome needs reconciliation");
      }
    } catch (error) {
      transfer.errorCode = safeErrorCode(error);
      state.status = deriveMigrationStatus(state.transfers);
      await store.save(state);
      throw error;
    }
  }
  state.status = "aborted";
  state.updatedAt = now();
  await store.save(state);
  return state;
}

function createSerialPersist(state, store, now) {
  let chain = Promise.resolve();
  return () => {
    state.updatedAt = now();
    const snapshot = structuredClone(state);
    chain = chain.then(() => store.save(snapshot));
    return chain;
  };
}

function validateCompatibilityReport(report) {
  if (!isRecord(report) || typeof report.compatible !== "boolean" || !Array.isArray(report.rooms)) {
    throw new Error("Compatibility endpoint returned an invalid report");
  }
  const rooms = report.rooms.map((room) => {
    if (
      !isRecord(room) ||
      !isSafeRoomId(room.roomId) ||
      !isSafeOpaqueId(room.sessionId) ||
      !Number.isSafeInteger(room.ownerEpoch) ||
      room.ownerEpoch < 0 ||
      typeof room.compatible !== "boolean"
    ) {
      throw new Error("Compatibility endpoint returned an invalid room entry");
    }
    return {
      roomId: room.roomId,
      sessionId: room.sessionId,
      ownerEpoch: room.ownerEpoch,
      compatible: room.compatible,
      ...(isSafeReasonCode(room.reasonCode) ? { reasonCode: room.reasonCode } : {}),
    };
  });
  if (new Set(rooms.map((room) => room.roomId)).size !== rooms.length) {
    throw new Error("Compatibility endpoint returned duplicate room IDs");
  }
  return rooms;
}

function sanitizeBlockers(blockers, rooms) {
  const roomIds = new Set(rooms.filter((room) => !room.compatible).map((room) => room.roomId));
  if (!Array.isArray(blockers)) return [...roomIds];
  return [...new Set(blockers.filter((value) => typeof value === "string" && roomIds.has(value)))];
}

function assertDestinationReady(readiness, slot, { allowAuthoritativeRooms = false } = {}) {
  if (
    !readiness ||
    readiness.ready !== true ||
    readiness.acceptingNewRooms !== false ||
    !Number.isSafeInteger(readiness.authoritativeRooms) ||
    readiness.authoritativeRooms < 0 ||
    (!allowAuthoritativeRooms && readiness.authoritativeRooms !== 0)
  ) {
    throw new Error(`${slot} destination is not ready and idle; source remains authoritative`);
  }
}

function updateTransferFromAdmin(transfer, response, updatedAt) {
  assertTransferResponse(response);
  const status = normalizeTransferStatus(response.status);
  if (status === "pending") throw new Error("Admin response cannot move a transfer backward to pending");
  const wasSwitched = OWNER_SWITCHED_STATUSES.has(transfer.status);
  const minimumOwnerEpoch = transfer.ownerEpoch ?? transfer.sourceOwnerEpoch;
  if (OWNER_SWITCHED_STATUSES.has(status)) {
    if (!Number.isSafeInteger(response.ownerEpoch) || response.ownerEpoch < minimumOwnerEpoch) {
      throw new Error("Admin response omitted or regressed the owner epoch after ownership changed");
    }
    if (!wasSwitched && response.ownerEpoch <= transfer.sourceOwnerEpoch) {
      throw new Error("Admin response did not advance the owner epoch at the ownership switch");
    }
  }
  if (Number.isSafeInteger(response.ownerEpoch) && response.ownerEpoch >= 0) {
    if (response.ownerEpoch < minimumOwnerEpoch) throw new Error("Admin response returned a stale owner epoch");
    transfer.ownerEpoch = response.ownerEpoch;
  }
  transfer.status = status;
  transfer.updatedAt = updatedAt;
}

function deriveMigrationStatus(transfers) {
  if (transfers.length > 0 && transfers.every((transfer) => transfer.status === "completed")) return "completed";
  if (transfers.length > 0 && transfers.every((transfer) => transfer.status === "aborted")) return "aborted";
  if (transfers.some((transfer) => transfer.errorCode)) return "needs_reconcile";
  const switched = transfers.some((transfer) => OWNER_SWITCHED_STATUSES.has(transfer.status));
  const notSwitched = transfers.some(
    (transfer) => !OWNER_SWITCHED_STATUSES.has(transfer.status) && transfer.status !== "aborted",
  );
  if (switched && notSwitched) return "partially_switched";
  if (switched) return "owner_switched";
  if (transfers.some((transfer) => ["preparing", "frozen", "snapshot_saved"].includes(transfer.status)))
    return "preparing";
  if (transfers.length > 0 && transfers.every((transfer) => transfer.status === "destination_validated")) return "destination_validated";
  if (transfers.some((transfer) => transfer.status === "aborted")) return "preparation_incomplete";
  return "compatible";
}

async function mapLimit(values, concurrencyLimit, operation) {
  const results = new Array(values.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await operation(values[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrencyLimit, values.length) }, worker));
  return results;
}

function assertMigrationInputs({ migrationId, sourceSlot, destinationSlot }) {
  if (!isSafeOpaqueId(migrationId)) {
    throw new Error("A valid migrationId is required");
  }
  if (!isDeploymentSlot(sourceSlot) || !isDeploymentSlot(destinationSlot) || sourceSlot === destinationSlot) {
    throw new Error("Distinct valid source and destination slots are required");
  }
}

function validatePersistedState(state, expectedMigrationId) {
  if (
    !isRecord(state) ||
    state.schemaVersion !== 1 ||
    !isSafeOpaqueId(state.migrationId) ||
    (expectedMigrationId && state.migrationId !== expectedMigrationId) ||
    !isDeploymentSlot(state.sourceSlot) ||
    !isDeploymentSlot(state.destinationSlot) ||
    state.sourceSlot === state.destinationSlot ||
    !MIGRATION_STATUSES.has(state.status) ||
    !Array.isArray(state.transfers) ||
    !state.transfers.every(isPersistedTransfer) ||
    new Set(state.transfers.map(({ roomId }) => roomId)).size !== state.transfers.length ||
    new Set(state.transfers.flatMap(({ transferId }) => (transferId ? [transferId] : []))).size !==
      state.transfers.filter(({ transferId }) => transferId).length
  ) {
    throw new Error("Persisted handoff state is invalid; refusing to continue");
  }
}

function isPersistedTransfer(value) {
  return (
    isRecord(value) &&
    isSafeRoomId(value.roomId) &&
    Number.isSafeInteger(value.sourceOwnerEpoch) &&
    value.sourceOwnerEpoch >= 0 &&
    TRANSFER_STATUSES.has(value.status) &&
    (value.transferId === undefined || isSafeOpaqueId(value.transferId)) &&
    (value.ownerEpoch === undefined || (Number.isSafeInteger(value.ownerEpoch) && value.ownerEpoch >= 0)) &&
    (value.errorCode === undefined || isSafeReasonCode(value.errorCode)) &&
    (!new Set(["preparing", "frozen", "snapshot_saved", "destination_validated", "owner_switched", "destination_active", "completed"]).has(
      value.status,
    ) ||
      Boolean(value.transferId)) &&
    (!OWNER_SWITCHED_STATUSES.has(value.status) || Number.isSafeInteger(value.ownerEpoch))
  );
}

function assertTransferResponse(response, expectedStatus) {
  if (!isRecord(response) || !TRANSFER_STATUSES.has(response.status)) {
    throw new Error("Transfer endpoint returned an invalid status");
  }
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`Transfer endpoint returned ${response.status}, expected ${expectedStatus}`);
  }
}

function normalizeTransferStatus(status) {
  if (!TRANSFER_STATUSES.has(status)) throw new Error("Transfer endpoint returned an unknown status");
  return status;
}

function assertMode(mode) {
  if (!new Set(["check", "prepare", "migrate", "promote", "progress", "abort", "reconcile", "cleanup-check"]).has(mode)) {
    throw new Error(`Unsupported handoff mode: ${mode}`);
  }
}

function assertPositiveInteger(value, name, max) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}`);
  }
}

function requiredOpaqueId(value, name) {
  if (!isSafeOpaqueId(value)) {
    throw new Error(`Transfer endpoint returned an invalid ${name}`);
  }
  return value;
}

function isSafeOpaqueId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9:._-]{7,127}$/.test(value);
}

function isSafeRoomId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(value);
}

function isSafeReasonCode(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

function safeErrorCode(error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  return isSafeReasonCode(code) ? code : "admin-operation-failed";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createHandoffAdminPort({ request, statuses, readiness }) {
  if (typeof request !== "function" || typeof statuses !== "function" || typeof readiness !== "function") {
    throw new Error("Handoff admin adapter requires request, status, and readiness ports");
  }
  const path = (transferId, suffix = "") => `/deployment/handoff/transfers/${encodeURIComponent(transferId)}${suffix}`;
  const transferView = (response) => {
    const transfer = isRecord(response?.transfer) ? response.transfer : response;
    if (!isRecord(transfer)) throw new Error("Handoff status endpoint returned an invalid transfer");
    return { ...transfer, ...(Number.isSafeInteger(response.ownerEpoch ?? transfer.ownerEpoch) ? { ownerEpoch: response.ownerEpoch ?? transfer.ownerEpoch } : {}) };
  };
  return {
    checkCompatibility: ({ migrationId, sourceSlot, destinationSlot }) =>
      request(sourceSlot, "/deployment/handoff/compatibility", "POST", { migrationId, destinationSlot }),
    destinationReadiness: async ({ slot }) => {
      const [processes, health, safety] = await Promise.all([
        statuses(slot),
        readiness(slot),
        request(slot, `/deployment/handoff/cleanup-safety?slot=${encodeURIComponent(slot)}`, "GET"),
      ]);
      const authoritativeRoomCounts = processes.map((entry) => entry.handoff?.authoritativeRooms);
      return {
        ready: health.length === 3 && health.every((entry) => entry.slot === slot && entry.status === "ready"),
        acceptingNewRooms: processes.some((entry) => entry.acceptingNewRooms),
        authoritativeRooms:
          Number.isSafeInteger(safety.authoritativeRooms)
            ? safety.authoritativeRooms
            : processes.length === 3 && authoritativeRoomCounts.every(Number.isSafeInteger)
            ? authoritativeRoomCounts.reduce((sum, count) => sum + count, 0)
            : undefined,
      };
    },
    prepare: async (input) => {
      const { room, transferId, migrationId, sourceSlot, destinationSlot, executionVersion, rulesVersion, sourceRevision } = input;
      const authorization = await request(sourceSlot, "/deployment/handoff/authorize-destination", "POST", {
        transferId,
        sessionId: room.sessionId,
        expectedOwnerEpoch: room.ownerEpoch,
        sourceSlot,
        destinationSlot,
      });
      if (!isRecord(authorization) || typeof authorization.sourceAuthorization !== "string") {
        throw new Error("Source failed to authorize the destination reservation");
      }
      await request(destinationSlot, "/deployment/handoff/destinations/reserve", "POST", {
        transferId,
        sessionId: room.sessionId,
        expectedOwnerEpoch: room.ownerEpoch,
        sourceSlot,
        destinationSlot,
        sourceAuthorization: authorization.sourceAuthorization,
      });
      await request(sourceSlot, "/deployment/handoff/prepare", "POST", {
        transferId,
        sourceSlot,
        executionVersion,
        rulesVersion,
        sourceRevision,
      });
      const validated = await request(destinationSlot, path(transferId, "/validate"), "POST", {
        destinationSlot,
        executionVersion,
        rulesVersion,
        sourceRevision,
      });
      return transferView(validated);
    },
    migrate: async (input) => {
      const { sourceSlot, destinationSlot, transferId } = input;
      const owner = await request(sourceSlot, path(transferId, "/migrate"), "POST", { sourceSlot });
      const completed = await request(destinationSlot, path(transferId, "/activate"), "POST", { destinationSlot });
      await request(sourceSlot, path(transferId, "/complete"), "POST", { sourceSlot });
      return { ...transferView(completed), ownerEpoch: owner.ownerEpoch };
    },
    progress: async (input) => transferView(await request(input.sourceSlot, path(input.transferId), "GET")),
    reconcile: async (input) => {
      const { transfer } = await request(input.sourceSlot, path(input.transferId, "/reconcile"), "POST", input);
      if (transfer.status === "owner_switched" || transfer.status === "destination_active") {
        const completed = await request(input.destinationSlot, path(input.transferId, "/activate"), "POST", {
          destinationSlot: input.destinationSlot,
        });
        await request(input.sourceSlot, path(input.transferId, "/complete"), "POST", { sourceSlot: input.sourceSlot });
        const view = transferView(completed);
        return { ...view, ownerEpoch: view.toOwnerEpoch };
      }
      if (transfer.status === "completed") {
        await request(input.sourceSlot, path(input.transferId, "/complete"), "POST", { sourceSlot: input.sourceSlot });
      }
      return transferView({ transfer, ownerEpoch: (await request(input.sourceSlot, path(input.transferId), "GET")).ownerEpoch });
    },
    abort: async (input) => {
      const aborted = await request(input.sourceSlot, path(input.transferId, "/abort"), "POST", { sourceSlot: input.sourceSlot });
      await request(input.destinationSlot, path(input.transferId, "/discard"), "POST", { destinationSlot: input.destinationSlot });
      return transferView(aborted);
    },
    cleanupSafety: ({ slot }) => request(slot, "/deployment/handoff/cleanup-safety", "GET"),
  };
}

export function createMigrationId() {
  return randomUUID();
}
