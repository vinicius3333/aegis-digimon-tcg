import { availableParallelism } from "node:os";
import { defineConfig, configDefaults } from "vitest/config";
import { testExecArgv, testMaxWorkers } from "./vitest.workers.js";

// Heavy suites: slow engine-compute, the fuzzer's 2000 random
// iterations, and the per-card files. Excluded from the `test:fast` inner loop
// (set FAST=1) so day-to-day runs stay quick; the full `pnpm test` still runs them.
const heavySuites = [
  "src/engine/mechanic.test.ts",
  "src/engine/effectFiring.test.ts",
  "src/engine/fuzzer.test.ts",
  "src/cards/**",
  "src/engine/conformance/**",
];

// The transaction lane needs a real Postgres, so it is its own opt-in lane (`pnpm test:postgres`,
// or POSTGRES_TESTS=1 with POSTGRES_TEST_URL). It is excluded rather than skipped: a suite that
// cannot run here is not a pending test, and reporting it as one buries a real skip in the noise.
const postgresLane = "src/db/postgres.atomicity.test.ts";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [
      ...configDefaults.exclude,
      ...(process.env.FAST ? heavySuites : []),
      ...(process.env.POSTGRES_TESTS === "1" ? [] : [postgresLane]),
    ],
    // `forks` (process isolation) gives each file a full heap. `threads` shares a
    // capped worker heap and the full card suite exhausts it (ERR_WORKER_OUT_OF_MEMORY),
    // GC-thrashing for ~80s before dying.
    pool: "forks",
    maxWorkers: testMaxWorkers(availableParallelism()),
    execArgv: testExecArgv(process.argv),
    // Per-file isolation is off everywhere: importing @aegis/shared + the ~4,700 card
    // effects costs ~4s of module loading that `isolate: true` re-pays for every file,
    // dwarfing the test bodies. Reusing one module graph per worker is 1.6–3x faster with
    // identical pass/fail. Safe because card registration is idempotent (registry.ts /
    // registerIrCard) and the registry's only cross-file writer (resolution.test.ts)
    // restores its override in `afterAll`. Re-enable per file with `--isolate` if a new
    // test depends on a fresh module graph; better, reset that shared state between files.
    isolate: false,
    // Transformed modules persist under node_modules so a rerun skips the transform pass
    // instead of repeating it (measured at 2-10x on a warm card-set run).
    fsModuleCache: true,
    testTimeout: 15_000,
    slowTestThreshold: 3_000,
  },
});
