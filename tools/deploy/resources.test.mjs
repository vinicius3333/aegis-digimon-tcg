import { test } from "node:test";
import assert from "node:assert/strict";
import { cpuCounters, cpuUsage, assertHostCapacity } from "./resources.mjs";
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
test("capacity refuses CPU saturation, overload, low disk and missing measurements", () => {
  assert.doesNotThrow(() => assertHostCapacity(good));
  for (const change of [
    { cpuUsage: 0.81 },
    { load5: 5.01 },
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
