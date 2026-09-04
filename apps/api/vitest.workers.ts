import { enableCompileCache } from "node:module";

// V8 bytecode cache for every module the workers load; the parent enables it here so the
// forked workers inherit NODE_COMPILE_CACHE. Measured at ~25% off a warm card-set run.
enableCompileCache();

/**
 * Worker count for the card suites. With `isolate: false` each worker keeps the module
 * graph of every file it ran, so worst-case memory is workers x heap ceiling; the default
 * leaves headroom on a 16 GB machine and TEST_MAX_WORKERS (or the legacy TEST_MAX_FORKS)
 * raises it per run.
 */
export function testMaxWorkers(parallelism: number): number {
  const requested = Number(process.env.TEST_MAX_WORKERS ?? process.env.TEST_MAX_FORKS);
  if (Number.isInteger(requested) && requested > 0) return requested;
  return Math.max(1, Math.min(4, Math.floor(parallelism / 2)));
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
