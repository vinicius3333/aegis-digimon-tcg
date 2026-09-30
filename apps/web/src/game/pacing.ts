/* Every timing knob sequential effect pacing reads, in one place.

   Code reads the knobs through `activePacing()` at the moment it waits, never at module load,
   so a change made by the effects lab or the Effect speed setting applies to the next effect
   without remounting the match. `current` pacing reads nothing from here.

   Each pacing style has its own config in `PACING_BY_STYLE`, and `DEFAULT_PACING_STYLE` picks
   the one players get. To try values live, open /dev/effects-lab, use the Pacing tuner, then
   paste its "Copy as TS" output over the style's config. */

export interface PacingConfig {
  /** How long an effect's source card glows before its clause appears (ms). */
  sourceHoldMs: number;
  /** How long an effect's clause is read, alone, before its results play (ms). */
  announceMs: number;
  /** The rest after an effect's results, before the next effect lights up (ms). */
  settleMs: number;
  /** `announceMs` for a minor effect: memory or DP changes only (ms). */
  minorAnnounceMs: number;
  /** `settleMs` for a minor effect: memory or DP changes only (ms). */
  minorSettleMs: number;
  /** Safety ceiling: the longest an effect waits for its clause before its results play anyway (ms). */
  announceMaxMs: number;
  /** Safety ceiling: the longest an effect waits for its results and its close before it settles anyway (ms). */
  resultsMaxMs: number;
  /** How much each effect still to play stretches the board, prompt and stall budgets (ms). */
  unitBudgetMs: number;
  /** The most any stretched budget may grow to (ms). */
  budgetCeilingMs: number;
  /** How long the chain recap chip stays after a chain ends (ms). */
  recapLifetimeMs: number;
  /** The fewest effects a chain needs before the resolution strip shows (count). */
  minChainLength: number;
  /**
   * How long an effect's clause stays on screen, counted from when it appeared, once the next
   * effect's clause takes its place: it stays dimmed under the new one (ms). 0 takes it off
   * at once.
   */
  clauseStackMs: number;
}

export type PacingKnob = keyof PacingConfig;

/**
 * How the clauses of a chain share the screen.
 *
 * - `sequential`: one clause at a time, each read alone for a long beat.
 * - `stacked`: a short beat per effect, and the recent clauses stay visible, dimmed, in a
 *   compact stack under the one resolving now, so a clause can still be read after its beat.
 */
export type PacingStyle = "sequential" | "stacked";

export const PACING_STYLES: readonly PacingStyle[] = ["sequential", "stacked"];

const SEQUENTIAL_PACING: PacingConfig = {
  sourceHoldMs: 360,
  announceMs: 700,
  settleMs: 300,
  minorAnnounceMs: 450,
  minorSettleMs: 150,
  announceMaxMs: 8000,
  resultsMaxMs: 6000,
  unitBudgetMs: 2500,
  budgetCeilingMs: 20000,
  recapLifetimeMs: 8000,
  minChainLength: 2,
  clauseStackMs: 0,
};

const STACKED_PACING: PacingConfig = {
  ...SEQUENTIAL_PACING,
  announceMs: 500,
  settleMs: 300,
  minorAnnounceMs: 350,
  minorSettleMs: 150,
  clauseStackMs: 5000,
};

export const PACING_BY_STYLE: Record<PacingStyle, PacingConfig> = {
  sequential: SEQUENTIAL_PACING,
  stacked: STACKED_PACING,
};

export const DEFAULT_PACING_STYLE: PacingStyle = "stacked";

export const DEFAULT_PACING: PacingConfig = PACING_BY_STYLE[DEFAULT_PACING_STYLE];

/** The beats a viewer watches. The other knobs are safety bounds or counts, which a speed must not shrink. */
export const SPEED_SCALED_KNOBS: readonly PacingKnob[] = [
  "sourceHoldMs",
  "announceMs",
  "settleMs",
  "minorAnnounceMs",
  "minorSettleMs",
  "unitBudgetMs",
];

export type EffectSpeed = "slow" | "normal" | "fast";

export const EFFECT_SPEEDS: readonly EffectSpeed[] = ["slow", "normal", "fast"];

/** What each Effect speed multiplies the watched beats by. */
export const EFFECT_SPEED_SCALE: Record<EffectSpeed, number> = { slow: 1.4, normal: 1, fast: 0.55 };

export function scalePacing(config: PacingConfig, scale: number): PacingConfig {
  const scaled = { ...config };
  for (const knob of SPEED_SCALED_KNOBS) scaled[knob] = Math.round(config[knob] * scale);
  return scaled;
}

const EFFECT_SPEED_STORAGE_KEY = "aegis.effect-speed";

function readEffectSpeed(): EffectSpeed {
  try {
    const stored = localStorage.getItem(EFFECT_SPEED_STORAGE_KEY);
    return EFFECT_SPEEDS.find((speed) => speed === stored) ?? "normal";
  } catch {
    return "normal";
  }
}

let basePacing = DEFAULT_PACING;
let effectSpeed = readEffectSpeed();
let active = scalePacing(basePacing, EFFECT_SPEED_SCALE[effectSpeed]);

/** The knobs in force right now: the base config scaled by the viewer's Effect speed. */
export function activePacing(): PacingConfig {
  return active;
}

export function basePacingConfig(): PacingConfig {
  return basePacing;
}

/** Replaces the unscaled config. The effects lab tuner uses this; the game never does. */
export function setBasePacing(config: PacingConfig): void {
  basePacing = config;
  active = scalePacing(basePacing, EFFECT_SPEED_SCALE[effectSpeed]);
}

export function getEffectSpeed(): EffectSpeed {
  return effectSpeed;
}

export function setEffectSpeed(next: EffectSpeed): void {
  effectSpeed = next;
  active = scalePacing(basePacing, EFFECT_SPEED_SCALE[effectSpeed]);
  try {
    localStorage.setItem(EFFECT_SPEED_STORAGE_KEY, next);
  } catch {
    // Keep the current-session speed when storage is unavailable.
  }
}
