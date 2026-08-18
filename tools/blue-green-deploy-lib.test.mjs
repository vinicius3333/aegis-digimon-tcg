import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeploymentManifest,
  chooseBootstrapAction,
  chooseDeploymentAction,
  chooseDrainAction,
} from "./blue-green-deploy-lib.mjs";

const revision = (name) => ({
  revision: name,
  apiImage: `ghcr.io/aegis/api@sha256:${name.padEnd(64, "0")}`,
  webImage: `ghcr.io/aegis/web@sha256:${name.padEnd(64, "0")}`,
});

test("bootstraps blue when no slot is active", () => {
  assert.deepEqual(chooseDeploymentAction({
    state: { version: 1, active: null, draining: null, pending: null, slots: {} },
    request: revision("first"),
    activeRooms: {},
  }), { kind: "deploy", targetSlot: "blue" });
});

test("deploys to the inactive slot when it is empty", () => {
  assert.deepEqual(chooseDeploymentAction({
    state: {
      version: 1,
      active: { slot: "blue", revision: "old" },
      draining: null,
      pending: null,
      slots: { blue: revision("old") },
    },
    request: revision("new"),
    activeRooms: { green: 0 },
  }), { kind: "deploy", targetSlot: "green" });
});

test("queues the newest revision instead of replacing a slot with rooms", () => {
  assert.deepEqual(chooseDeploymentAction({
    state: {
      version: 1,
      active: { slot: "green", revision: "current" },
      draining: { slot: "blue", revision: "old" },
      pending: revision("superseded"),
      slots: { blue: revision("old"), green: revision("current") },
    },
    request: revision("newest"),
    activeRooms: { blue: 1 },
  }), { kind: "queue", pending: revision("newest") });
});

test("drain cleanup is forbidden until the old room count reaches zero", () => {
  const state = {
    version: 1,
    active: { slot: "green", revision: "current" },
    draining: { slot: "blue", revision: "old" },
    pending: null,
    slots: { blue: revision("old"), green: revision("current") },
  };
  assert.deepEqual(chooseDrainAction({ state, activeRooms: 2 }), { kind: "wait", slot: "blue", activeRooms: 2 });
  assert.deepEqual(chooseDrainAction({ state, activeRooms: 0 }), { kind: "cleanup", slot: "blue" });
});

test("public manifest contains routing data but no image references", () => {
  const state = {
    version: 1,
    active: { slot: "green", revision: "current" },
    draining: { slot: "blue", revision: "old" },
    pending: revision("private-pending"),
    slots: { blue: revision("old"), green: revision("current") },
  };
  assert.deepEqual(buildDeploymentManifest(state), {
    version: 1,
    active: { slot: "green", revision: "current" },
    draining: [{ slot: "blue", revision: "old" }],
  });
});

test("legacy bootstrap requires a stable zero-connection window", () => {
  assert.deepEqual(chooseBootstrapAction({
    connectionCount: 2,
    zeroSince: 100,
    now: 200,
    stableMilliseconds: 1_000,
  }), { kind: "wait", connectionCount: 2, zeroSince: null });
  assert.deepEqual(chooseBootstrapAction({
    connectionCount: 0,
    zeroSince: null,
    now: 200,
    stableMilliseconds: 1_000,
  }), { kind: "mark_zero", zeroSince: 200 });
  assert.deepEqual(chooseBootstrapAction({
    connectionCount: 0,
    zeroSince: 200,
    now: 900,
    stableMilliseconds: 1_000,
  }), { kind: "wait", connectionCount: 0, zeroSince: 200, remainingMilliseconds: 300 });
  assert.deepEqual(chooseBootstrapAction({
    connectionCount: 0,
    zeroSince: 200,
    now: 1_200,
    stableMilliseconds: 1_000,
  }), { kind: "finalize" });
});
