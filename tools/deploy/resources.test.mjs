import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  cpuCounters,
  cpuUsage,
  assertHostCapacity,
  sampleHostCapacity,
  waitForHostCapacity,
  HostCpuBusyError,
} from "./resources.mjs";
const good = { cpuUsage: 0.2, cores: 4, load5: 3.7, diskFreeBytes: 20 * 1024 ** 3 };
test("CPU accounting excludes guest counters already included in user time", () => {
  const before = cpuCounters("cpu 100 0 50 850 0 0 0 0 90 0\ncpu0 1\ncpu1 1\n");
  const after = cpuCounters("cpu 110 0 60 930 0 0 0 0 100 0\ncpu0 1\ncpu1 1\n");
  assert.equal(before.total, 1000);
  assert.equal(before.cores, 2);
  assert.ok(Math.abs(cpuUsage(before, after) - 0.2) < 0.00001);
  assert.throws(() => cpuUsage(before, before), /unverifiable/);
  assert.throws(() => cpuCounters("cpu 1 2 broken"), /unverifiable/);
});
test("historical load does not veto measured CPU headroom", () => {
  assert.doesNotThrow(() => assertHostCapacity({ ...good, cpuUsage: 0.65, load5: 13.95 }));
});

test("host CPU sampling averages a five-second window", async (t) => {
  const state = mkdtempSync(`${tmpdir()}/aegis-capacity-`);
  t.after(() => rmSync(state, { recursive: true }));
  const cpuStatPath = `${state}/stat`;
  const loadavgPath = `${state}/loadavg`;
  writeFileSync(cpuStatPath, "cpu 100 0 50 850 0 0 0 0 0 0\ncpu0 1\ncpu1 1\n");
  writeFileSync(loadavgPath, "14 13.95 12 3/2000 100\n");
  const capacity = await sampleHostCapacity({
    state,
    cpuStatPath,
    loadavgPath,
    wait: async (ms) => {
      assert.equal(ms, 5000);
      writeFileSync(cpuStatPath, "cpu 160 0 90 950 0 0 0 0 0 0\ncpu0 1\ncpu1 1\n");
    },
  });
  assert.equal(capacity.cpuUsage, 0.5);
  assert.equal(capacity.load5, 13.95);
  assert.equal(capacity.sampleMs, 5000);
  assert.ok(capacity.diskFreeBytes >= 0);
});

test("capacity refuses CPU saturation, low disk and missing measurements", () => {
  assert.doesNotThrow(() => assertHostCapacity(good));
  for (const change of [
    { cpuUsage: 0.81 },
    { load5: NaN },
    { cores: 0 },
    { diskFreeBytes: NaN },
    { cpuUsage: -1 },
    { diskFreeBytes: 15 * 1024 ** 3 - 1 },
  ]) {
    assert.throws(() => assertHostCapacity({ ...good, ...change }));
  }
  assert.doesNotThrow(() => assertHostCapacity({ ...good, diskFreeBytes: 10 * 1024 ** 3 }, "before-start"));
  assert.throws(() => assertHostCapacity({ ...good, diskFreeBytes: 10 * 1024 ** 3 - 1 }, "before-start"), /free disk/);
});

test("capacity retries a busy window and admits measured headroom despite historical load", async () => {
  const samples = [
    { ...good, cpuUsage: 0.95, load5: 13.95 },
    { ...good, cpuUsage: 0.65, load5: 13.95 },
  ];
  let calls = 0;
  const messages = [];
  const capacity = await waitForHostCapacity({
    state: "/unused",
    phase: "before-build",
    log: (message) => messages.push(message),
    capacitySampler: async ({ state }) => {
      assert.equal(state, "/unused");
      return samples[calls++];
    },
  });
  assert.equal(calls, 2);
  assert.equal(capacity, samples[1]);
  assert.match(messages[0], /resampling \(1\/6\)/);
  assert.match(messages[1], /capacity available/);
});

test("sustained CPU saturation stops after six windows", async () => {
  let calls = 0;
  await assert.rejects(
    waitForHostCapacity({
      state: "/unused",
      phase: "before-start",
      log: () => undefined,
      capacitySampler: async () => {
        calls++;
        return { ...good, cpuUsage: 0.95 };
      },
    }),
    HostCpuBusyError,
  );
  assert.equal(calls, 6);
});

test("invalid metrics and scarce disk fail immediately even when CPU is busy", async () => {
  for (const change of [{ load5: NaN }, { diskFreeBytes: 14 * 1024 ** 3 }]) {
    let calls = 0;
    await assert.rejects(
      waitForHostCapacity({
        state: "/unused",
        phase: "before-build",
        log: () => undefined,
        capacitySampler: async () => {
          calls++;
          return { ...good, cpuUsage: 0.95, ...change };
        },
      }),
      /unverifiable|free disk/,
    );
    assert.equal(calls, 1);
  }
});
