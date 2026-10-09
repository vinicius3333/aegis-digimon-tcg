/* The pacing budget: fails when a change makes effect pacing worse than the committed
   baseline (test/pacing/pacing-baseline.json), or breaks a rule paced effects promise.
   After an intended change, refresh the baseline with `pnpm --filter @aegis/web pacing:baseline`.

   The matrix runs one entry at a time on one fake clock and shared pacing globals, so it
   cannot run concurrently inside one worker. It is split into interleaved shards instead,
   one test file each (pacing.budget.<n>.test.ts), so Vitest measures them in parallel
   workers. Every shard checks its own rows against the same rules. */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { minReadableMs } from "./metrics";
import { rowKey, summarize, type SummaryRow } from "./report";
import { matrix, measureEntry, type MatrixEntry } from "./runMatrix";

/** One shard per default Vitest worker (`TEST_MAX_THREADS`, 4). */
const BUDGET_SHARDS = 4;

const SHARD_FILE = /^pacing\.budget\.\d+\.test\.ts$/;
const shardFile = (shard: number) => `pacing.budget.${shard}.test.ts`;

/** Interleaved, so each shard gets a similar mix of short and long chains. */
function budgetShard(shard: number): MatrixEntry[] {
  return matrix().filter((_, position) => position % BUDGET_SHARDS === shard - 1);
}

const entryKey = (entry: MatrixEntry) =>
  rowKey({ scenario: entry.plan.variant ?? entry.plan.id, pacing: entry.pacing, speed: entry.speed });

// Keep the measurement exemption scoped to this suite; subsequent suites must still fail
// if a product gate reaches its ceiling.
const measuredFlag = Symbol.for("aegis.gateExpiriesMeasured");

/** Slack on durations, so a harmless reordering of timers does not fail the build. */
const DURATION_SLACK = 1.1;
const DURATION_SLACK_MS = 250;

const baseline = new Map(
  (JSON.parse(readFileSync(resolve(process.cwd(), "test/pacing/pacing-baseline.json"), "utf8")) as SummaryRow[]).map(
    (row) => [rowKey(row), row],
  ),
);

/**
 * The chains rebuilt from production logs (apps/api/src/engine/devScenario.ts). Paced, they
 * must show no board ahead, no unreadable clause and no stall. Each also has a ceiling on its shown time at Normal
 * speed per pacing style: about 10% over what it measured.
 */
const PRODUCTION_CHAINS: Record<
  string,
  {
    normalShownMs: number;
    stackedNormalShownMs: number;
  }
> = {
  "effects-lab-prod-ghost-execute": {
    normalShownMs: 59_000,
    stackedNormalShownMs: 49_000,
  },
  "effects-lab-prod-ghost-execute-security": {
    normalShownMs: 66_000,
    stackedNormalShownMs: 55_000,
  },
  "effects-lab-prod-attack-stack": {
    normalShownMs: 51_000,
    stackedNormalShownMs: 36_000,
  },
  "effects-lab-prod-security-removed": { normalShownMs: 18_500, stackedNormalShownMs: 13_000 },
  "effects-lab-prod-titan-cascade": { normalShownMs: 23_000, stackedNormalShownMs: 17_000 },
};

function budgetOf(row: SummaryRow): SummaryRow {
  const budget = baseline.get(rowKey(row));
  if (!budget) throw new Error(`${rowKey(row)} has no baseline; run pacing:baseline`);
  return budget;
}

/** The runs breaking a rule, with what they measured, so a failure names every culprit at once. */
function breaking(
  runs: readonly SummaryRow[],
  measured: (row: SummaryRow) => number,
  limit: (row: SummaryRow) => number,
): string[] {
  return runs.flatMap((row) =>
    measured(row) > limit(row) ? [`${rowKey(row)}: ${measured(row)} > ${Math.round(limit(row))}`] : [],
  );
}

/** Measures shard `shard` (1-based) of the matrix and checks every rule on its rows. */
export function defineBudgetSuite(shard: number): void {
  const entries = budgetShard(shard);
  let rows: SummaryRow[] = [];
  let priorMeasuredFlag: unknown;

  beforeAll(async () => {
    priorMeasuredFlag = (globalThis as Record<symbol, unknown>)[measuredFlag];
    (globalThis as Record<symbol, unknown>)[measuredFlag] = true;
    rows = [];
    for (const entry of entries) rows.push(summarize(await measureEntry(entry)));
  }, 120_000);
  afterAll(() => {
    if (priorMeasuredFlag === undefined) delete (globalThis as Record<symbol, unknown>)[measuredFlag];
    else (globalThis as Record<symbol, unknown>)[measuredFlag] = priorMeasuredFlag;
  });

  /** The runs in a pacing style, which paces effects one at a time. */
  const paced = () => rows.filter((row) => row.pacing !== "current");
  const pacedProductionChains = () => paced().filter((row) => row.scenario in PRODUCTION_CHAINS);

  describe(`effect pacing budget, shard ${shard} of ${BUDGET_SHARDS}`, () => {
    it("measures the complete matrix rather than silently passing a filtered or empty run", () => {
      expect(process.env.PACING_ONLY).toBeUndefined();
      const shardFiles = readdirSync(resolve(process.cwd(), "test/pacing")).filter((file) => SHARD_FILE.test(file));
      expect(shardFiles.sort()).toEqual(Array.from({ length: BUDGET_SHARDS }, (_, index) => shardFile(index + 1)));
      expect(rows.map(rowKey)).toEqual(entries.map(entryKey));
      expect(rows.length).toBeGreaterThan(0);
    });

    it("finishes every scenario", () => {
      expect(rows.filter((row) => row.timedOut).map(rowKey)).toEqual([]);
      expect(
        breaking(
          rows,
          (row) => row.pendingSteps,
          () => 0,
        ),
      ).toEqual([]);
      expect(
        breaking(
          rows,
          (row) => row.failedSteps,
          () => 0,
        ),
      ).toEqual([]);
      expect(
        breaking(
          rows,
          (row) => row.droppedSteps,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("announces every accepted effect, including isolated effects", () => {
      expect(
        breaking(
          paced(),
          (row) => row.missingAnnouncements,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("holds optional effect toasts until the viewer answers", () => {
      expect(
        breaking(
          paced(),
          (row) => row.optionalAnnouncementsBeforeAnswer,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("keeps isolated and chained results behind their own announcements", () => {
      expect(
        breaking(
          paced(),
          (row) => row.allResultsBeforeCause,
          () => 0,
        ),
      ).toEqual([]);
      expect(
        breaking(
          paced(),
          (row) => row.costBeforeFocus,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("keeps isolated and chained effects readable", () => {
      expect(
        breaking(
          paced(),
          (row) => row.allUnreadable,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("finishes paced chains without rescuing the board or a prompt by its budget", () => {
      for (const metric of ["boardBudgetHits", "decisionBudgetHits", "decisionStallHits"] as const)
        expect(
          breaking(
            paced(),
            (row) => row[metric],
            () => 0,
          ).map((culprit) => `${metric} ${culprit}`),
        ).toEqual([]);
    });

    it("never shows two active effect clauses at once when paced", () => {
      expect(
        breaking(
          paced(),
          (row) => row.maxActiveClauses,
          () => 1,
        ),
      ).toEqual([]);
    });

    it("shows no result before its cause when paced", () => {
      expect(
        breaking(
          paced(),
          (row) => row.resultBeforeCause,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("keeps the board from running ahead no more than the baseline", () => {
      expect(
        breaking(
          paced(),
          (row) => row.boardAheadUnits,
          () => 0,
        ),
      ).toEqual([]);
      expect(
        breaking(
          paced(),
          (row) => row.boardAheadMs,
          () => 0,
        ),
      ).toEqual([]);
      expect(
        breaking(
          rows,
          (row) => row.boardAheadUnits,
          (row) => budgetOf(row).boardAheadUnits,
        ),
      ).toEqual([]);
      expect(
        breaking(
          rows,
          (row) => row.boardAheadMs,
          (row) => budgetOf(row).boardAheadMs + DURATION_SLACK_MS,
        ),
      ).toEqual([]);
    });

    it("keeps every chain within its duration budget", () => {
      const limit = (row: SummaryRow) => budgetOf(row).presentationMs * DURATION_SLACK + DURATION_SLACK_MS;
      expect(breaking(rows, (row) => row.presentationMs, limit)).toEqual([]);
    });

    it(`leaves each effect's clause readable for its minimum readable time (${minReadableMs()} ms at Normal)`, () => {
      expect(
        breaking(
          paced(),
          (row) => row.unreadable,
          (row) => budgetOf(row).unreadable,
        ),
      ).toEqual([]);
    });

    it("never stalls on a gate ceiling when paced", () => {
      expect(
        breaking(
          paced(),
          (row) => row.gateExpiries,
          () => 0,
        ),
      ).toEqual([]);
    });

    it("keeps the production chains readable, in order and on the board they announce", () => {
      const metrics = ["boardAheadUnits", "unreadable", "gateExpiries"] as const;
      expect(
        metrics.flatMap((metric) =>
          breaking(
            pacedProductionChains(),
            (row) => row[metric],
            () => 0,
          ).map((culprit) => `${metric} ${culprit}`),
        ),
      ).toEqual([]);
    });

    it("keeps each production chain under its shown-time ceiling at Normal", () => {
      expect(
        breaking(
          pacedProductionChains().filter((row) => row.speed === "normal"),
          (row) => row.presentationMs,
          (row) =>
            row.pacing === "stacked"
              ? PRODUCTION_CHAINS[row.scenario]!.stackedNormalShownMs
              : PRODUCTION_CHAINS[row.scenario]!.normalShownMs,
        ),
      ).toEqual([]);
    });

    it("stalls on a gate ceiling no more often than the baseline", () => {
      expect(
        breaking(
          rows,
          (row) => row.gateExpiries,
          (row) => budgetOf(row).gateExpiries,
        ),
      ).toEqual([]);
    });
  });
}
