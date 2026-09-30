/* The effects lab's pacing tuner: the range each knob may take, the presets, the stored
   config and the "Copy as TS" literal. Pure apart from the storage wrappers, so it is tested
   without the lab. */

import {
  DEFAULT_PACING,
  EFFECT_SPEED_SCALE,
  PACING_BY_STYLE,
  scalePacing,
  type PacingConfig,
  type PacingKnob,
} from "../game/pacing";
import { TIMINGS } from "../game/timings";

export interface KnobSpec {
  label: string;
  /** The line "Copy as TS" writes above the knob. */
  doc: string;
  unit: "ms" | "count";
  min: number;
  max: number;
  step: number;
}

export const KNOB_SPECS: Record<PacingKnob, KnobSpec> = {
  sourceHoldMs: {
    label: "Source glow",
    doc: "How long an effect's source card glows before its clause appears (ms).",
    unit: "ms",
    min: 0,
    max: 1500,
    step: 20,
  },
  announceMs: {
    label: "Announce",
    doc: "How long an effect's clause is read, alone, before its results play (ms).",
    unit: "ms",
    min: 0,
    max: 2500,
    step: 50,
  },
  settleMs: {
    label: "Settle",
    doc: "The rest after an effect's results, before the next effect lights up (ms).",
    unit: "ms",
    min: 0,
    max: 1500,
    step: 50,
  },
  minorAnnounceMs: {
    label: "Minor announce",
    doc: "`announceMs` for a minor effect: memory or DP changes only (ms).",
    unit: "ms",
    min: 0,
    max: 2500,
    step: 50,
  },
  minorSettleMs: {
    label: "Minor settle",
    doc: "`settleMs` for a minor effect: memory or DP changes only (ms).",
    unit: "ms",
    min: 0,
    max: 1500,
    step: 50,
  },
  announceMaxMs: {
    label: "Announce ceiling",
    doc: "Safety ceiling: the longest an effect waits for its clause before its results play anyway (ms).",
    unit: "ms",
    min: 1000,
    max: 20000,
    step: 500,
  },
  resultsMaxMs: {
    label: "Results ceiling",
    doc: "Safety ceiling: the longest an effect waits for its results and its close before it settles anyway (ms).",
    unit: "ms",
    min: 1000,
    max: 20000,
    step: 500,
  },
  unitBudgetMs: {
    label: "Budget per pending effect",
    doc: "How much each effect still to play stretches the board, prompt and stall budgets (ms).",
    unit: "ms",
    min: 500,
    max: 6000,
    step: 100,
  },
  budgetCeilingMs: {
    label: "Budget ceiling",
    doc: "The most any stretched budget may grow to (ms).",
    unit: "ms",
    min: 5000,
    max: 60000,
    step: 1000,
  },
  recapLifetimeMs: {
    label: "Recap lifetime",
    doc: "How long the chain recap chip stays after a chain ends (ms).",
    unit: "ms",
    min: 1000,
    max: 30000,
    step: 500,
  },
  minChainLength: {
    label: "Strip min chain",
    doc: "The fewest effects a chain needs before the resolution strip shows (count).",
    unit: "count",
    min: 1,
    max: 6,
    step: 1,
  },
  shortSourceHoldMs: {
    label: "Short glow",
    doc: "The source glow for an effect that takes the short beats (ms).",
    unit: "ms",
    min: 0,
    max: 1500,
    step: 20,
  },
  repeatShortBeats: {
    label: "Short repeats",
    doc: "1: an opponent's effect whose card and text already resolved in this chain takes the short beats. 0: off.",
    unit: "count",
    min: 0,
    max: 1,
    step: 1,
  },
  chainTailFrom: {
    label: "Tail after",
    doc: "Effects after this many in one chain play their beats at `chainTailPercent`. 0: off (count).",
    unit: "count",
    min: 0,
    max: 12,
    step: 1,
  },
  chainTailPercent: {
    label: "Tail beats %",
    doc: "How long the beats of an effect late in a long chain are, as a share of their length (%).",
    unit: "count",
    min: 20,
    max: 100,
    step: 5,
  },
  overlapResults: {
    label: "Overlap results",
    doc: "1: the next effect lights up while this effect's results still play, when they leave its source alone. 0: off.",
    unit: "count",
    min: 0,
    max: 1,
    step: 1,
  },
  resumeAnnounceMs: {
    label: "Resume beat",
    doc: "The beat between the viewer's answer and what it did, for an effect they were asked about (ms).",
    unit: "ms",
    min: 0,
    max: 2500,
    step: 50,
  },
  clauseReadableMs: {
    label: "Readable floor",
    doc: "The least time a paced clause stays on screen before a newer clause may push it out of a full column (ms). 0: no floor.",
    unit: "ms",
    min: 0,
    max: 5000,
    step: 50,
  },
  clauseStackMs: {
    label: "Clause stack",
    doc: "How long a clause stays on screen, dimmed, once the next clause takes its place, from when it appeared (ms). 0 takes it off at once.",
    unit: "ms",
    min: 0,
    max: 10000,
    step: 250,
  },
};

export const PACING_KNOBS = Object.keys(DEFAULT_PACING) as PacingKnob[];

export type PacingPreset = "slow" | "normal" | "fast" | "sequential" | "stacked" | "currentLike";

export const PACING_PRESET_LABELS: Record<PacingPreset, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
  sequential: "Sequential",
  stacked: "Stacked",
  currentLike: "Current-like",
};

/**
 * Slow, Normal and Fast are the defaults at each Effect speed, so a preset shows what a
 * player on that speed sees. Sequential and Stacked are each pacing style unscaled.
 * Current-like keeps the strict one-at-a-time order but gives each effect only the beats
 * `current` pacing gives it: the source glow and nothing else.
 */
export const PACING_PRESETS: Record<PacingPreset, PacingConfig> = {
  slow: scalePacing(DEFAULT_PACING, EFFECT_SPEED_SCALE.slow),
  normal: DEFAULT_PACING,
  fast: scalePacing(DEFAULT_PACING, EFFECT_SPEED_SCALE.fast),
  sequential: PACING_BY_STYLE.sequential,
  stacked: PACING_BY_STYLE.stacked,
  currentLike: {
    ...DEFAULT_PACING,
    sourceHoldMs: TIMINGS.effectSourceHold,
    shortSourceHoldMs: TIMINGS.effectSourceHold,
    resumeAnnounceMs: 0,
    announceMs: 0,
    settleMs: 0,
    minorAnnounceMs: 0,
    minorSettleMs: 0,
    clauseStackMs: 0,
  },
};

function clampKnob(knob: PacingKnob, value: number): number {
  const spec = KNOB_SPECS[knob];
  return Math.min(spec.max, Math.max(spec.min, Math.round(value)));
}

/** The config with one knob changed, kept inside the knob's range. A non-number leaves it as it was. */
export function withKnob(config: PacingConfig, knob: PacingKnob, value: number): PacingConfig {
  if (!Number.isFinite(value)) return config;
  return { ...config, [knob]: clampKnob(knob, value) };
}

/** A stored config, read defensively: unknown or broken knobs fall back to the defaults. */
export function parseStoredPacing(raw: string | null): PacingConfig {
  if (!raw) return DEFAULT_PACING;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return DEFAULT_PACING;
  }
  if (typeof stored !== "object" || stored === null) return DEFAULT_PACING;
  const values = stored as Partial<Record<PacingKnob, unknown>>;
  let config = DEFAULT_PACING;
  for (const knob of PACING_KNOBS) {
    const value = values[knob];
    if (typeof value === "number") config = withKnob(config, knob, value);
  }
  return config;
}

/** A config literal ready to paste over a style's config in game/pacing.ts. */
export function pacingAsTypeScript(config: PacingConfig): string {
  const lines = PACING_KNOBS.flatMap((knob) => [`  /** ${KNOB_SPECS[knob].doc} */`, `  ${knob}: ${config[knob]},`]);
  return ["const TUNED_PACING: PacingConfig = {", ...lines, "};", ""].join("\n");
}

const STORAGE_KEY = "aegis.dev.effects-lab.pacing";

export function loadTunedPacing(): PacingConfig {
  try {
    return parseStoredPacing(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PACING;
  }
}

export function saveTunedPacing(config: PacingConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // The tuned values still apply for this session.
  }
}
