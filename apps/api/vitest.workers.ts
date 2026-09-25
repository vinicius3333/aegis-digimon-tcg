import { enableCompileCache } from "node:module";
import { totalmem } from "node:os";

// V8 bytecode cache for every module the workers load; the parent enables it here so the
// forked workers inherit NODE_COMPILE_CACHE. Measured at ~25% off a warm card-set run.
enableCompileCache();

const reservedSystemGiB = 6;
// Peak worker RSS depends on how the 5,000+ files are distributed across workers.
const workerMemoryGiB = 1.25;

/**
 * Heap ceiling per forked worker (--max-old-space-size, MB; override with TEST_HEAP_MB).
 * The full suite passes with 1.5 GB per worker when run with eight workers.
 */
export function testHeapMegabytes(): number {
  const requested = Number(process.env.TEST_HEAP_MB);
  return Number.isInteger(requested) && requested > 0 ? requested : 1536;
}

/**
 * Worker count for the card suites. On the 10-core, 16 GiB development machine,
 * eight workers finished the full suite in 28.77s with a 1.5 GiB heap cap;
 * four took 39.14s, six 38.70s, and ten 43.18s in the same quiet window.
 * Leave one fifth of the CPUs available, reserve 6 GiB for the OS/Vite, and budget each
 * worker its measured peak memory, not its heap ceiling: the ceiling only guards against
 * runaway growth.
 * TEST_MAX_WORKERS (or the legacy TEST_MAX_FORKS) remains an explicit override.
 */
export function testMaxWorkers(
  parallelism: number,
  memoryBytes = totalmem(),
): number {
  const requested = Number(process.env.TEST_MAX_WORKERS ?? process.env.TEST_MAX_FORKS);
  if (Number.isInteger(requested) && requested > 0) return requested;
  const cpuWorkers = Math.floor(parallelism * 0.8);
  const memoryWorkers = Math.floor((memoryBytes / 1024 ** 3 - reservedSystemGiB) / workerMemoryGiB);
  return Math.max(1, Math.min(8, cpuWorkers, memoryWorkers));
}

/**
 * Worker threads reject --max-old-space-size (a thread cannot resize the process heap), so a
 * `--pool=threads` run gets no ceiling.
 */
export function testExecArgv(argv: readonly string[]): string[] {
  if (argv.some((arg) => arg === "--pool=threads" || arg === "--pool=vmThreads")) return [];
  return [`--max-old-space-size=${testHeapMegabytes()}`];
}
