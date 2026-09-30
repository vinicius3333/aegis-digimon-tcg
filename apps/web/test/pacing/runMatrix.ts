/* The measured matrix: every scenario under `current`, and under `sequential` at each Effect
   speed. `current` reads no pacing knob, so it runs once. */

import { vi } from "vitest";
import type { EffectSpeed } from "../../src/game/pacing";
import type { PresentationPacing } from "../../src/game/presentationProbe";
import { observeGateExpiry } from "../../src/game/match/presentationGate";
import { measure, type RunMetrics } from "./metrics";
import { runScenario } from "./runScenario";
import { SCENARIO_PLANS, type ScenarioPlan } from "./scenarios";

export interface MatrixEntry {
  plan: ScenarioPlan;
  pacing: PresentationPacing;
  speed: EffectSpeed;
}

export function matrix(speeds: readonly EffectSpeed[] = ["slow", "normal", "fast"]): MatrixEntry[] {
  return SCENARIO_PLANS.flatMap((plan) => [
    { plan, pacing: "current" as const, speed: "normal" as const },
    ...speeds.map((speed) => ({ plan, pacing: "sequential" as const, speed })),
  ]);
}

const FAKED = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "setImmediate",
  "clearImmediate",
  "Date",
  "performance",
] as const;

/** A fixed wall clock, so card release gates and every timestamp repeat run to run. */
const CLOCK_START = Date.parse("2026-09-30T12:00:00Z");

export async function measureEntry(entry: MatrixEntry): Promise<RunMetrics> {
  vi.useFakeTimers({ toFake: [...FAKED], now: CLOCK_START });
  const expiries: string[] = [];
  const stop = observeGateExpiry(({ label }) => expiries.push(label));
  try {
    const recording = await runScenario(entry);
    return measure({ ...recording, gateExpiries: expiries });
  } finally {
    stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  }
}
