// @vitest-environment jsdom
/* The pacing budget: fails when a change makes effect pacing worse than the committed
   baseline (test/pacing/pacing-baseline.json), or breaks a rule paced effects promise.
   After an intended change, refresh the baseline with `pnpm --filter @aegis/web pacing:baseline`. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { minReadableMs } from "./metrics";
import { rowKey, summarize, type SummaryRow } from "./report";
import { matrix, measureEntry } from "./runMatrix";

vi.mock("../../src/design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

// Keep the measurement exemption scoped to this suite; subsequent suites must still fail
// if a product gate reaches its ceiling.
const measuredFlag = Symbol.for("aegis.gateExpiriesMeasured");
let priorMeasuredFlag: unknown;

/** Slack on durations, so a harmless reordering of timers does not fail the build. */
const DURATION_SLACK = 1.1;
const DURATION_SLACK_MS = 250;

const baseline = new Map(
  (JSON.parse(readFileSync(resolve(process.cwd(), "test/pacing/pacing-baseline.json"), "utf8")) as SummaryRow[]).map(
    (row) => [rowKey(row), row],
  ),
);

let rows: SummaryRow[] = [];

beforeAll(async () => {
  priorMeasuredFlag = (globalThis as Record<symbol, unknown>)[measuredFlag];
  (globalThis as Record<symbol, unknown>)[measuredFlag] = true;
  rows = [];
  for (const entry of matrix()) rows.push(summarize(await measureEntry(entry)));
}, 120_000);
afterAll(() => {
  if (priorMeasuredFlag === undefined) delete (globalThis as Record<symbol, unknown>)[measuredFlag];
  else (globalThis as Record<symbol, unknown>)[measuredFlag] = priorMeasuredFlag;
});

/** The runs in a pacing style, which paces effects one at a time. */
const paced = () => rows.filter((row) => row.pacing !== "current");

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
  "effects-lab-prod-security-removed": { normalShownMs: 16_000, stackedNormalShownMs: 13_000 },
  "effects-lab-prod-titan-cascade": { normalShownMs: 23_000, stackedNormalShownMs: 17_000 },
};

const pacedProductionChains = () => paced().filter((row) => row.scenario in PRODUCTION_CHAINS);

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

describe("effect pacing budget", () => {
  it("measures the complete matrix rather than silently passing a filtered or empty run", () => {
    expect(process.env.PACING_ONLY).toBeUndefined();
    expect(rows.length).toBe(matrix().length);
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
        ),
        metric,
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
