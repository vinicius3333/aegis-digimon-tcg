import { defineConfig, configDefaults } from "vitest/config";

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
    // GC-thrashing for ~80s before dying. The fast inner loop overrides to `--pool=threads`.
    pool: "forks",
    // Cap memory: bound each fork's V8 heap (--max-old-space-size, default 3 GB, override
    // with TEST_HEAP_MB) and the fork count (default 2, override with TEST_MAX_FORKS) so
    // total test memory stays bounded instead of scaling with the core count.
    //
    // Fork COUNT is the lever that matters for machine load: --max-old-space-size is a
    // ceiling, not a reservation, so lowering it does not reduce what a run actually uses,
    // while each extra fork is another full process competing for CPU and RAM. Worst case is
    // maxForks x heap, so keep the default low and raise it per-run when a machine can take it.
    poolOptions: {
      forks: {
        // 3072 was not enough: with `isolate: false` a fork keeps the module graph and
        // registry state of every file it runs, and at ~790 suites per fork the run died with
        // "Ineffective mark-compacts near heap limit" AFTER the reporter had written its
        // results — so the suite passed while the process exited 1, reporting a green run as
        // red. Raising the per-fork ceiling is the fix that matches the cause; the parent's
        // heap was never the constraint (NODE_OPTIONS there changes nothing, since execArgv
        // overrides it for the forks).
        execArgv: [`--max-old-space-size=${process.env.TEST_HEAP_MB ?? 6144}`],
        maxForks: Number(process.env.TEST_MAX_FORKS ?? 2),
        minForks: 1,
      },
    },
    // Per-file isolation is off everywhere: importing @aegis/shared + the ~4,700 card
    // effects costs ~4s of module loading that `isolate: true` re-pays for every file,
    // dwarfing the test bodies (collect ~520s vs tests ~12s on the full card suite). Reusing
    // one module graph per worker is 1.6–3x faster with identical pass/fail. Safe because
    // card registration is idempotent (registry.ts / registerIrCard) and the registry's
    // only cross-file writer (resolution.test.ts) restores its override in `afterAll`.
    // Re-enable per file with `--isolate` if a new test depends on a fresh module graph;
    // better, reset that shared state between files instead.
    isolate: true,
    testTimeout: 15_000,
    slowTestThreshold: 3_000,
  },
});
