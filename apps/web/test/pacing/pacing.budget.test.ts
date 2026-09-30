// @vitest-environment jsdom
/* The pacing budget: fails when a change makes effect pacing worse than the committed
   baseline (test/pacing/pacing-baseline.json), or breaks a rule sequential pacing promises.
   After an intended change, refresh the baseline with `pnpm --filter @aegis/web pacing:baseline`. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { minReadableMs } from "./metrics";
import { rowKey, summarize, type SummaryRow } from "./report";
import { matrix, measureEntry } from "./runMatrix";

vi.mock("../../src/design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

// Stalls are a budget line here, not an error thrown by test/setupGateExpiry.ts.
(globalThis as Record<symbol, unknown>)[Symbol.for("aegis.gateExpiriesMeasured")] = true;

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
  rows = [];
  for (const entry of matrix()) rows.push(summarize(await measureEntry(entry)));
}, 120_000);

const sequential = () => rows.filter((row) => row.pacing === "sequential");

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
  it("finishes every scenario", () => {
    expect(rows.filter((row) => row.timedOut).map(rowKey)).toEqual([]);
  });

  it("never shows two effect clauses at once under sequential pacing", () => {
    expect(
      breaking(
        sequential(),
        (row) => row.maxConcurrentClauses,
        () => 1,
      ),
    ).toEqual([]);
  });

  it("shows no result before its cause under sequential pacing", () => {
    expect(
      breaking(
        sequential(),
        (row) => row.resultBeforeCause,
        () => 0,
      ),
    ).toEqual([]);
  });

  it("keeps the board from running ahead no more than the baseline", () => {
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

  it(`leaves each effect's clause alone on screen for its minimum readable time (${minReadableMs()} ms at Normal)`, () => {
    expect(
      breaking(
        sequential(),
        (row) => row.unreadable,
        (row) => budgetOf(row).unreadable,
      ),
    ).toEqual([]);
  });

  it("never stalls on a gate ceiling under sequential pacing", () => {
    expect(
      breaking(
        sequential(),
        (row) => row.gateExpiries,
        () => 0,
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
