/* One summary row per run, the Markdown table, and the comparison against the baseline. */

import { median, minReadableMs, fullReadingMs, type RunMetrics } from "./metrics";
import { EFFECT_SPEED_SCALE, type EffectSpeed } from "../../src/game/pacing";

export interface SummaryRow {
  scenario: string;
  pacing: string;
  speed: string;
  chains: number;
  units: number;
  /** Sum over chains: first announce (or result) to the last settle. */
  chainMs: number;
  /** `chainMs` less the time a prompt stood open for the viewer's own answer. */
  presentationMs: number;
  /** Median over units: clause shown to first result on screen. */
  announceToResultMs: number | null;
  /** Median over consecutive units: next clause shown minus previous results end. */
  settleGapMs: number | null;
  maxConcurrentClauses: number;
  resultBeforeCause: number;
  boardAheadUnits: number;
  boardAheadMs: number;
  deadMs: number;
  minorShare: number;
  /** Shortest time any narrated chain effect's clause stood alone on screen. */
  minAloneMs: number | null;
  /** Narrated chain effects whose clause stood alone less than the minimum readable time. */
  unreadable: number;
  /** Share of narrated chain effects whose clause stayed up long enough to read in full. */
  fullyReadableShare: number | null;
  maxPromptDelayMs: number | null;
  gateExpiries: number;
  timedOut: boolean;
}

export const rowKey = (row: Pick<SummaryRow, "scenario" | "pacing" | "speed">) =>
  `${row.scenario}|${row.pacing}|${row.speed}`;

export function summarize(metrics: RunMetrics): SummaryRow {
  const units = metrics.chains.flatMap((chain) => chain.units);
  const narrated = units.filter((unit) => unit.narrated);
  const scale = metrics.pacing === "sequential" ? EFFECT_SPEED_SCALE[metrics.speed as EffectSpeed] : 1;
  const delays = metrics.decisions.flatMap((decision) =>
    decision.promptDelayMs !== undefined ? [decision.promptDelayMs] : [],
  );
  const round = (value: number | undefined) => (value === undefined ? null : Math.round(value));
  return {
    scenario: metrics.scenario,
    pacing: metrics.pacing,
    speed: metrics.speed,
    chains: metrics.chains.length,
    units: units.length,
    chainMs: metrics.chains.reduce((total, chain) => total + chain.durationMs, 0),
    presentationMs: metrics.chains.reduce((total, chain) => total + chain.presentationMs, 0),
    announceToResultMs: round(median(metrics.chains.flatMap((chain) => chain.announceToResultMs))),
    settleGapMs: round(median(metrics.chains.flatMap((chain) => chain.settleGapsMs))),
    maxConcurrentClauses: Math.max(0, ...metrics.chains.map((chain) => chain.maxConcurrentClauses)),
    resultBeforeCause: metrics.chains.reduce((total, chain) => total + chain.resultBeforeCause, 0),
    boardAheadUnits: metrics.chains.reduce((total, chain) => total + chain.boardAheadUnits, 0),
    boardAheadMs: metrics.chains.reduce((total, chain) => total + chain.boardAheadMs, 0),
    deadMs: metrics.chains.reduce((total, chain) => total + chain.deadMs, 0),
    minorShare:
      units.length === 0 ? 0 : Math.round((units.filter((unit) => unit.minor).length / units.length) * 100) / 100,
    minAloneMs: narrated.length === 0 ? null : Math.min(...narrated.map((unit) => unit.aloneMs)),
    unreadable: narrated.filter((unit) => unit.aloneMs < minReadableMs(scale)).length,
    fullyReadableShare:
      narrated.length === 0
        ? null
        : Math.round(
            (narrated.filter((unit) => unit.visibleMs >= fullReadingMs(unit.words)).length / narrated.length) * 100,
          ) / 100,
    maxPromptDelayMs: delays.length === 0 ? null : Math.max(...delays),
    gateExpiries: metrics.gateExpiries.length,
    timedOut: metrics.timedOut,
  };
}

const COLUMNS: readonly [keyof SummaryRow, string][] = [
  ["scenario", "scenario"],
  ["pacing", "pacing"],
  ["speed", "speed"],
  ["units", "fx"],
  ["chainMs", "chain ms"],
  ["presentationMs", "shown ms"],
  ["announceToResultMs", "ann→res"],
  ["settleGapMs", "settle gap"],
  ["maxConcurrentClauses", "max clauses"],
  ["resultBeforeCause", "RBC"],
  ["boardAheadUnits", "ahead fx"],
  ["boardAheadMs", "ahead ms"],
  ["deadMs", "dead ms"],
  ["minorShare", "minor"],
  ["minAloneMs", "min alone"],
  ["unreadable", "unreadable"],
  ["fullyReadableShare", "full read"],
  ["maxPromptDelayMs", "prompt delay"],
  ["gateExpiries", "stalls"],
];

export function markdownTable(rows: readonly SummaryRow[]): string {
  const header = `| ${COLUMNS.map(([, label]) => label).join(" | ")} |`;
  const rule = `|${COLUMNS.map(() => "---").join("|")}|`;
  const body = rows.map(
    (row) =>
      `| ${COLUMNS.map(([key]) => {
        const value = row[key];
        return value === null ? "–" : String(value);
      }).join(" | ")}${row.timedOut ? " ⚠ timed out" : ""} |`,
  );
  return [header, rule, ...body].join("\n");
}

const COMPARED: readonly (keyof SummaryRow)[] = [
  "presentationMs",
  "announceToResultMs",
  "maxConcurrentClauses",
  "resultBeforeCause",
  "boardAheadUnits",
  "boardAheadMs",
  "deadMs",
  "unreadable",
  "maxPromptDelayMs",
  "gateExpiries",
];

/** One line per run whose compared numbers moved against the baseline. */
export function compareWithBaseline(rows: readonly SummaryRow[], baseline: readonly SummaryRow[]): string[] {
  const before = new Map(baseline.map((row) => [rowKey(row), row]));
  const lines: string[] = [];
  for (const row of rows) {
    const previous = before.get(rowKey(row));
    if (!previous) {
      lines.push(`${rowKey(row)}: new run`);
      continue;
    }
    const changes = COMPARED.flatMap((key) => {
      const [was, now] = [previous[key], row[key]];
      if (was === now) return [];
      const delta =
        typeof was === "number" && typeof now === "number" ? ` (${now - was > 0 ? "+" : ""}${now - was})` : "";
      return [`${key} ${String(was)} → ${String(now)}${delta}`];
    });
    if (changes.length > 0) lines.push(`${rowKey(row)}: ${changes.join(", ")}`);
  }
  return lines;
}
