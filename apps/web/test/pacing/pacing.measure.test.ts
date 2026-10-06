// @vitest-environment jsdom
/* `pnpm --filter @aegis/web pacing:measure`: runs the whole matrix, writes the report and
   prints what moved against the committed baseline. Set PACING_UPDATE_BASELINE=1 to accept
   the new numbers as the baseline. Skipped in the ordinary test run. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { matrix, measureEntry } from "./runMatrix";
import { compareWithBaseline, markdownTable, rowKey, summarize, type SummaryRow } from "./report";

vi.mock("../../src/design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

// Vitest runs from apps/web; jsdom gives `import.meta.url` an http scheme, so paths hang off the root.
const BASELINE = resolve(process.cwd(), "test/pacing/pacing-baseline.json");
const OUTPUT = resolve(process.cwd(), ".pacing-report") + "/";

describe.runIf(process.env.PACING_MEASURE === "1")("pacing measurement", () => {
  const measuredFlag = Symbol.for("aegis.gateExpiriesMeasured");
  let priorMeasuredFlag: unknown;
  beforeAll(() => {
    priorMeasuredFlag = (globalThis as Record<symbol, unknown>)[measuredFlag];
    (globalThis as Record<symbol, unknown>)[measuredFlag] = true;
  });
  afterAll(() => {
    if (priorMeasuredFlag === undefined) delete (globalThis as Record<symbol, unknown>)[measuredFlag];
    else (globalThis as Record<symbol, unknown>)[measuredFlag] = priorMeasuredFlag;
  });
  it("measures every scenario and compares it with the baseline", async () => {
    const runs = [];
    for (const entry of matrix()) runs.push(await measureEntry(entry));
    const rows = runs.map(summarize);
    mkdirSync(OUTPUT, { recursive: true });
    writeFileSync(`${OUTPUT}runs.json`, JSON.stringify(runs, null, 2));
    writeFileSync(`${OUTPUT}summary.json`, JSON.stringify(rows, null, 2));
    writeFileSync(`${OUTPUT}summary.md`, `${markdownTable(rows)}\n`);

    let baseline: SummaryRow[] = [];
    try {
      baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as SummaryRow[];
    } catch {
      // No baseline yet: every run is new.
    }
    const changes = compareWithBaseline(rows, baseline);
    process.stdout.write(`\n${markdownTable(rows)}\n\nAgainst the baseline:\n${changes.join("\n") || "no change"}\n`);
    if (process.env.PACING_UPDATE_BASELINE === "1") {
      if (process.env.PACING_ONLY)
        throw new Error("PACING_ONLY measures part of the matrix; unset it to write the baseline");
      const invariants = [
        "missingAnnouncements",
        "allUnreadable",
        "allResultsBeforeCause",
        "boardAheadUnits",
        "boardAheadMs",
        "costBeforeFocus",
        "optionalAnnouncementsBeforeAnswer",
        "pendingSteps",
        "failedSteps",
        "droppedSteps",
        "gateExpiries",
        "boardBudgetHits",
        "decisionBudgetHits",
        "decisionStallHits",
      ] as const;
      const failures = rows.flatMap((row) =>
        row.timedOut
          ? [`${rowKey(row)} timed out`]
          : row.pacing === "current"
            ? []
            : invariants.flatMap((metric) => (row[metric] > 0 ? [`${rowKey(row)} ${metric}=${row[metric]}`] : [])),
      );
      if (failures.length) throw new Error(`Cannot bless a failing paced baseline:\n${failures.join("\n")}`);
      writeFileSync(BASELINE, `${JSON.stringify(rows, null, 2)}\n`);
    }
    expect(rows.every((row) => !row.timedOut)).toBe(true);
  }, 600_000);
});
