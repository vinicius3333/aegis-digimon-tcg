import { readFileSync, statfsSync } from "node:fs";

export const API_MEMORY_MIB = 1500;
export const REDIS_MEMORY_MIB = 384;
export const GENERATION_MEMORY_MIB = 3 * API_MEMORY_MIB + REDIS_MEMORY_MIB;
const GIB = 1024 ** 3;
const CPU_SAMPLE_MS = 5000;
const CAPACITY_ATTEMPTS = 6;

export class HostCpuBusyError extends Error {}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cpuCounters(text) {
  const line = /^cpu\s+(.+)$/m.exec(text);
  const values = line?.[1].trim().split(/\s+/).slice(0, 8).map(Number);
  const cores = text.match(/^cpu\d+\s/gm)?.length;
  if (!values || values.length !== 8 || !cores || values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Host CPU counters are unverifiable");
  }
  return { total: values.reduce((sum, value) => sum + value, 0), idle: values[3] + values[4], cores };
}

export function cpuUsage(before, after) {
  const total = after.total - before.total;
  const idle = after.idle - before.idle;
  if (before.cores !== after.cores || total <= 0 || idle < 0 || idle > total) {
    throw new Error("Host CPU sample is unverifiable");
  }
  return 1 - idle / total;
}

export async function sampleHostCapacity({
  state,
  cpuStatPath = "/host/stat",
  loadavgPath = "/host/loadavg",
  wait: waitForSample = wait,
}) {
  const before = cpuCounters(readFileSync(cpuStatPath, "utf8"));
  await waitForSample(CPU_SAMPLE_MS);
  const after = cpuCounters(readFileSync(cpuStatPath, "utf8"));
  const load5 = Number(readFileSync(loadavgPath, "utf8").trim().split(/\s+/)[1]);
  const disk = statfsSync(state, { bigint: true });
  return {
    cpuUsage: cpuUsage(before, after),
    cores: after.cores,
    load5,
    diskFreeBytes: Number(disk.bavail * disk.bsize),
    sampleMs: CPU_SAMPLE_MS,
  };
}

export function assertHostCapacity(capacity, phase = "before-build") {
  const { cpuUsage: usage, cores, load5, diskFreeBytes } = capacity;
  if (
    !Number.isFinite(usage) ||
    usage < 0 ||
    usage > 1 ||
    !Number.isInteger(cores) ||
    cores < 1 ||
    !Number.isFinite(load5) ||
    load5 < 0 ||
    !Number.isSafeInteger(diskFreeBytes) ||
    diskFreeBytes < 0
  ) {
    throw new Error("Host CPU or disk capacity is unverifiable; existing services retained");
  }
  const required = phase === "before-build" ? 15 * GIB : 10 * GIB;
  if (diskFreeBytes < required) {
    throw new Error(`Deployment requires ${required / GIB} GiB of free disk ${phase}; existing services retained`);
  }
  // Load is a historical queue measure, not the fraction of CPU currently busy.
  // Keep it in diagnostics; admission uses the measured counter delta instead.
  if (usage > 0.8) {
    throw new HostCpuBusyError(
      `Host CPU is busy (${Math.round(usage * 100)}% average${capacity.sampleMs ? ` over ${capacity.sampleMs / 1000}s` : ""}, 5-minute load ${load5}/${cores}); retry when capacity is available`,
    );
  }
}

/** Wait through transient saturation; invalid data and scarce disk fail immediately. */
export async function waitForHostCapacity({ state, phase, capacitySampler = sampleHostCapacity, log = console.log }) {
  for (let attempt = 1; attempt <= CAPACITY_ATTEMPTS; attempt++) {
    const capacity = await capacitySampler({ state });
    try {
      assertHostCapacity(capacity, phase);
    } catch (error) {
      if (!(error instanceof HostCpuBusyError) || attempt === CAPACITY_ATTEMPTS) throw error;
      log(`${error.message}; resampling (${attempt}/${CAPACITY_ATTEMPTS})`);
      continue;
    }
    log(
      `Host capacity available: CPU ${Math.round(capacity.cpuUsage * 100)}% average${capacity.sampleMs ? ` over ${capacity.sampleMs / 1000}s` : ""}, diagnostic 5-minute load ${capacity.load5}/${capacity.cores}`,
    );
    return capacity;
  }
}
