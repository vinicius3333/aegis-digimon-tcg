/* Every timing knob sequential effect pacing reads, in one place.

   Code reads the knobs through `activePacing()` at the moment it waits, never at module load,
   so a change made by a timing harness or the Effect speed setting applies to the next effect
   without remounting the match. `current` pacing reads nothing from here.

   Each pacing style has its own config in `PACING_BY_STYLE`, and `DEFAULT_PACING_STYLE` picks
   the one players get. The effects lab uses the same default stacked config as a match;
   alternate configs are exercised by the timing harness. */

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
  /**
   * How long an effect's clause stays on screen, counted from when it appeared, once the next
   * effect's clause takes its place: it stays in the recent stack (ms). 0 takes it off
   * at once.
   */
  clauseStackMs: number;
  /** The source glow for an effect that takes the short beats (ms). */
  shortSourceHoldMs: number;
  /** 1: an opponent's effect whose card and text already resolved in this chain takes the short beats. 0: off. */
  repeatShortBeats: number;
  /** Effects after this many in one chain shorten their clause and settle beats. 0: off (count). */
  chainTailFrom: number;
  /** The clause and settle beats late in a chain, as a share of their length (%). Source focus stays whole. */
  chainTailPercent: number;
  /**
   * 1: the next effect lights up while this effect's results still play, when those results
   * leave the next effect's source card alone. 0: off.
   */
  overlapResults: number;
  /** The beat between the viewer's answer and what it did, for an effect they were asked about (ms). */
  resumeAnnounceMs: number;
  /**
   * The least time a paced clause stays on screen before a newer clause may push it out of
   * a full column (ms). 0: no floor.
   */
  clauseReadableMs: number;
}

export type PacingKnob = keyof PacingConfig;

/**
 * How the clauses of a chain share the screen.
 *
 * - `sequential`: one clause at a time, each read alone for a long beat.
 * - `stacked`: a short beat per effect, and the recent clauses stay visible in a
 *   compact stack under the one resolving now, so a clause can still be read after its beat.
 */
export type PacingStyle = "sequential" | "stacked";

export const PACING_STYLES: readonly PacingStyle[] = ["sequential", "stacked"];

const SEQUENTIAL_PACING: PacingConfig = {
  sourceHoldMs: 720,
  announceMs: 700,
  settleMs: 300,
  minorAnnounceMs: 450,
  minorSettleMs: 150,
  announceMaxMs: 8000,
  resultsMaxMs: 6000,
  unitBudgetMs: 2500,
  budgetCeilingMs: 20000,
  clauseStackMs: 0,
  shortSourceHoldMs: 720,
  repeatShortBeats: 0,
  chainTailFrom: 0,
  chainTailPercent: 100,
  overlapResults: 0,
  resumeAnnounceMs: 700,
  clauseReadableMs: 1720,
};

/* Long chains shorten clause and settle beats after their second effect. Every physical
   source keeps the full orientation moment so the viewer can find a different card.
   Recent clauses stay readable in the stack. The
   normal field lead-in is 920 ms (720 ms focus + 200 ms clause), close to DCGO's ~0.9 s,
   without speeding up card travel or truncating result visuals. The reading floor includes
   frame sampling margin at every speed; see pacing/REFERENCES.md. */
const STACKED_PACING: PacingConfig = {
  ...SEQUENTIAL_PACING,
  announceMs: 200,
  settleMs: 100,
  minorAnnounceMs: 200,
  minorSettleMs: 100,
  repeatShortBeats: 1,
  chainTailFrom: 2,
  chainTailPercent: 40,
  resumeAnnounceMs: 150,
  clauseReadableMs: 1720,
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
  "shortSourceHoldMs",
  "resumeAnnounceMs",
  "clauseReadableMs",
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

/** Harnesses replace the unscaled config; the effects lab restores the match default. */
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
