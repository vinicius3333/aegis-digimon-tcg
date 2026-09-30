/* The measured matrix: every scenario under `current`, and under each pacing style at each
   Effect speed. `current` reads no pacing knob, so it runs once. */

import { vi } from "vitest";
import { PACING_STYLES, type EffectSpeed } from "../../src/game/pacing";
import { observeGateExpiry } from "../../src/game/match/presentationGate";
import { measure, type RunMetrics } from "./metrics";
import { runScenario, type HarnessPacing } from "./runScenario";
import { SCENARIO_PLANS, type ScenarioPlan } from "./scenarios";

export interface MatrixEntry {
  plan: ScenarioPlan;
  pacing: HarnessPacing;
  speed: EffectSpeed;
}

/** `PACING_ONLY=id,id` narrows a run to those scenarios, for a quick local look. */
function selectedPlans(): readonly ScenarioPlan[] {
  const only = process.env.PACING_ONLY?.split(",").filter(Boolean);
  return only?.length ? SCENARIO_PLANS.filter((plan) => only.includes(plan.id)) : SCENARIO_PLANS;
}

export function matrix(speeds: readonly EffectSpeed[] = ["slow", "normal", "fast"]): MatrixEntry[] {
  return selectedPlans().flatMap((plan) => [
    { plan, pacing: "current" as const, speed: "normal" as const },
    ...PACING_STYLES.flatMap((pacing) => speeds.map((speed) => ({ plan, pacing, speed }))),
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
