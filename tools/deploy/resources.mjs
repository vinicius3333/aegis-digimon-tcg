import { readFileSync, statfsSync } from "node:fs";

export const API_MEMORY_MIB = 1500;
export const REDIS_MEMORY_MIB = 384;
export const GENERATION_MEMORY_MIB = 3 * API_MEMORY_MIB + REDIS_MEMORY_MIB;
const GIB = 1024 ** 3;

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

export async function sampleHostCapacity({ state, cpuStatPath = "/host/stat", loadavgPath = "/host/loadavg" }) {
  const before = cpuCounters(readFileSync(cpuStatPath, "utf8"));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const after = cpuCounters(readFileSync(cpuStatPath, "utf8"));
  const load5 = Number(readFileSync(loadavgPath, "utf8").trim().split(/\s+/)[1]);
  const disk = statfsSync(state, { bigint: true });
  return {
    cpuUsage: cpuUsage(before, after),
    cores: after.cores,
    load5,
    diskFreeBytes: Number(disk.bavail * disk.bsize),
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
  if (usage > 0.8 || load5 > cores * 1.25) {
    throw new Error(
      `Host CPU is busy (${Math.round(usage * 100)}%, 5-minute load ${load5}/${cores}); retry when capacity is available`,
    );
  }
  const required = phase === "before-build" ? 15 * GIB : 10 * GIB;
  if (diskFreeBytes < required) {
    throw new Error(`Deployment requires ${required / GIB} GiB of free disk ${phase}; existing services retained`);
  }
}
