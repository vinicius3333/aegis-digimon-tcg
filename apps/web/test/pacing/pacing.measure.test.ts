// @vitest-environment jsdom
/* `pnpm --filter @aegis/web pacing:measure`: runs the whole matrix, writes the report and
   prints what moved against the committed baseline. Set PACING_UPDATE_BASELINE=1 to accept
   the new numbers as the baseline. Skipped in the ordinary test run. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { matrix, measureEntry } from "./runMatrix";
import { compareWithBaseline, markdownTable, summarize, type SummaryRow } from "./report";

vi.mock("../../src/design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

// Vitest runs from apps/web; jsdom gives `import.meta.url` an http scheme, so paths hang off the root.
const BASELINE = resolve(process.cwd(), "test/pacing/pacing-baseline.json");
const OUTPUT = resolve(process.cwd(), ".pacing-report") + "/";

// Expiries are reported in the table rather than thrown by test/setupGateExpiry.ts.
(globalThis as Record<symbol, unknown>)[Symbol.for("aegis.gateExpiriesMeasured")] = true;

describe.runIf(process.env.PACING_MEASURE === "1")("pacing measurement", () => {
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
    if (process.env.PACING_UPDATE_BASELINE === "1") writeFileSync(BASELINE, `${JSON.stringify(rows, null, 2)}\n`);
    expect(rows.every((row) => !row.timedOut)).toBe(true);
  }, 600_000);
});
