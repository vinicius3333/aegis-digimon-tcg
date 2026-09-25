import { enableCompileCache } from "node:module";
import { totalmem } from "node:os";

// V8 bytecode cache for every module the workers load; the parent enables it here so the
// forked workers inherit NODE_COMPILE_CACHE. Measured at ~25% off a warm card-set run.
enableCompileCache();

const reservedSystemGiB = 6;
// Peak worker RSS measured on the full suite: ~1.1 GB with six workers, ~1.5 GB with four.
const workerMemoryGiB = 1.5;

/**
 * Heap ceiling per forked worker (--max-old-space-size, MB; override with TEST_HEAP_MB). A
 * run that keeps ~790 suites' module graphs in one worker needs more than 3 GB; with two or
 * more workers each holds a share, so 4 GB is enough.
 */
export function testHeapMegabytes(): number {
  const requested = Number(process.env.TEST_HEAP_MB);
  return Number.isInteger(requested) && requested > 0 ? requested : 4096;
}

/**
 * Worker count for the card suites. After bounding the engine's async context stores,
 * six workers beat four on the full suite; eight added startup cost without a gain.
 * Leave a quarter of the CPUs available, reserve 6 GiB for the OS/Vite, and budget each
 * worker its measured peak memory, not its heap ceiling: the ceiling only guards against
 * runaway growth. Budgeting the 4 GiB ceiling held a 16 GiB machine to two workers (62s);
 * six finish the same suite in ~41s.
 * TEST_MAX_WORKERS (or the legacy TEST_MAX_FORKS) remains an explicit override.
 */
export function testMaxWorkers(
  parallelism: number,
  memoryBytes = totalmem(),
): number {
  const requested = Number(process.env.TEST_MAX_WORKERS ?? process.env.TEST_MAX_FORKS);
  if (Number.isInteger(requested) && requested > 0) return requested;
  const cpuWorkers = Math.floor(parallelism * 0.75);
  const memoryWorkers = Math.floor((memoryBytes / 1024 ** 3 - reservedSystemGiB) / workerMemoryGiB);
  return Math.max(1, Math.min(6, cpuWorkers, memoryWorkers));
}

/**
 * Worker threads reject --max-old-space-size (a thread cannot resize the process heap), so a
 * `--pool=threads` run gets no ceiling.
 */
export function testExecArgv(argv: readonly string[]): string[] {
  if (argv.some((arg) => arg === "--pool=threads" || arg === "--pool=vmThreads")) return [];
  return [`--max-old-space-size=${testHeapMegabytes()}`];
}
