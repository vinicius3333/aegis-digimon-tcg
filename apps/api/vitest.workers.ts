import { enableCompileCache } from "node:module";
import { totalmem } from "node:os";

// V8 bytecode cache for every module the workers load; the parent enables it here so the
// forked workers inherit NODE_COMPILE_CACHE. Measured at ~25% off a warm card-set run.
enableCompileCache();

/**
 * Worker count for the card suites. After bounding the engine's async context stores,
 * six workers beat four on the full suite; eight added startup cost without a gain.
 * Leave a quarter of the CPUs available, reserve 4 GiB for the OS/Vite, and budget
 * 2 GiB per worker for its retained module graph. This is a concurrency budget, not
 * a hard memory limit (the independent heap ceiling below still applies).
 * TEST_MAX_WORKERS (or the legacy TEST_MAX_FORKS) remains an explicit override.
 */
export function testMaxWorkers(parallelism: number, memoryBytes = totalmem()): number {
  const requested = Number(process.env.TEST_MAX_WORKERS ?? process.env.TEST_MAX_FORKS);
  if (Number.isInteger(requested) && requested > 0) return requested;
  const cpuWorkers = Math.floor(parallelism * 0.75);
  const memoryWorkers = Math.floor((memoryBytes / 1024 ** 3 - 4) / 2);
  return Math.max(1, Math.min(6, cpuWorkers, memoryWorkers));
}

/**
 * Heap ceiling per forked worker (--max-old-space-size, MB; override with TEST_HEAP_MB). A
 * ceiling, not a reservation: it bounds what a worker may grow to, and a run that keeps ~790
 * suites' module graphs in one worker needs more than the 3 GB that first looked generous.
 * Worker threads reject the flag (a thread cannot resize the process heap), so a
 * `--pool=threads` run gets none.
 */
export function testExecArgv(argv: readonly string[]): string[] {
  if (argv.some((arg) => arg === "--pool=threads" || arg === "--pool=vmThreads")) return [];
  return [`--max-old-space-size=${process.env.TEST_HEAP_MB ?? 6144}`];
}
