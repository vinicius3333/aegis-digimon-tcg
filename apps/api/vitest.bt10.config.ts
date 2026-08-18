import { configDefaults, defineConfig } from "vitest/config";

/**
 * Exact historical card-test gate through BT10 (including EX1/EX2, starter
 * decks available by that era, and promos P-001 through P-077).
 *
 * Do not replace these globs with CLI directory filters: Vitest treats a
 * filter such as `src/cards/BT1` as a substring and also selects BT10, BT11,
 * BT12, and later sets.
 */
export default defineConfig({
  test: {
    include: [
      "src/cards/{BT1,BT2,BT3,BT4,BT5,BT6,BT7,BT8,BT9,BT10,EX1,EX2,ST1,ST2,ST3,ST4,ST5,ST6,ST7,ST8,ST9,ST10,ST11,ST12,ST13}/**/*.test.ts",
      "src/cards/P/P-{001..077}*.test.ts",
      "src/cards/P/{black-promo-control-deck,diaboromon-promo-deck,ghost-game-promo-traits-deck,green-digiburst-promo-deck,greymon-garurumon-promo-deck,imperialdramon-promo-option-deck,memory-boost-package,purple-trash-promo-decks,security-promo-gauntlet,veedramon-zero-promo-deck}.test.ts",
    ],
    exclude: configDefaults.exclude,
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: [`--max-old-space-size=${process.env.TEST_HEAP_MB ?? 6144}`],
        maxForks: Number(process.env.TEST_MAX_FORKS ?? 2),
        minForks: 1,
      },
    },
    isolate: false,
    testTimeout: 15_000,
    slowTestThreshold: 3_000,
  },
});
