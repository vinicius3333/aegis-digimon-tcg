// Continuous grants: auras, static modifiers, and effect disabling.

import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters/filter.js";
import type { KeywordRef } from "../keywords.js";
import type { Condition } from "../predicates/conditions.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";
import type { RestrictionKind } from "./restrictions.js";

export interface DynamicDigivolutionNamesAction extends ActionBase {
  kind: "DynamicDigivolutionNames";
}

/**
 * Grant a debuff aura to all opponent Digimon (P-075): a SubTrigger watcher is installed on each
 * matching opponent permanent and runs `actions` when its event occurs.
 */
export interface GrantAuraToOpponentsAction extends ActionBase {
  kind: "GrantAuraToOpponents";
  /** Default: all Digimon. */
  filter?: Filter;
  /** Alternative to `filter`. */
  target?: Target;
  /** The SubTrigger event the aura watches. */
  event: string;
  actions: Action[];
  duration: EffectDurationRef;
  /** Effect text for the aura, used by the GRANTEFFECT pattern. */
  effectText?: string;
}

/** The timing windows a `DisableTimingEffect` can suppress. */
export type DisableTiming = "whenDigivolving" | "whenAttacking" | "onPlay";

/**
 * Suppress a target permanent's [When Digivolving] / [When Attacking] / [On Play] windows, usually
 * the opponent's Digimon. Consulted by the per-effect activation gate so a masked effect does not
 * fire — unless the source permanent carries the `beAffected` immunity. This is the timing half of
 * the "can't activate effects" split; the security half is `DisableSecurityEffect`.
 */
export interface DisableTimingEffectAction extends ActionBase {
  kind: "DisableTimingEffect";
  target: Target;
  timings: DisableTiming[];
  duration: EffectDurationRef;
}

/**
 * A static grant with a DYNAMIC duration: live exactly while `while` holds. The classic shape is
 * "[Your Turn] While you have a blue Tamer in play, this Digimon gains ＜Jamming＞", which must NOT
 * be modeled as a once-per-turn event with a permanent grant — that would never expire once the
 * condition fails. The continuous layer re-checks the gate each evaluation.
 */
export interface AuraAction extends ActionBase {
  kind: "Aura";
  /** Defaults to the source. */
  target: Target;
  /** The single conferred continuous behavior. */
  effect:
    | { kind: "keyword"; keyword: KeywordRef }
    | { kind: "modifyDP"; amount: number }
    | { kind: "modifySecurityDP"; amount: number; seat?: "mine" | "opponent" }
    | { kind: "securityAttack"; amount: number }
    | { kind: "restriction"; restriction: RestrictionKind };
  /** Re-evaluated continuously. */
  while: Condition;
}

/**
 * A static name/trait grant ("also treated as [X]", "gains all effects of cards with [X] in their
 * digivolution cards"), resolved by the continuous-effect layer against the card DB.
 */
export interface GrantStaticAction extends ActionBase {
  kind: "GrantStatic";
  target: Target;
  /**
   * "name"/"trait" adds an alias; "effects" inherits the effects of matching stack cards;
   * "immuneToOpponentOptionEffects" stores a beAffected + fromSourceKind:Option restriction for
   * the duration (CAP-A8, BT19-089).
   */
  grant: "name" | "nameForDigiXros" | "trait" | "effects" | "kinds" | "immuneToOpponentOptionEffects" | string;
  /** Granted tokens from `[X]` refs. */
  tokens?: string[];
  /** The source filter for "effects". */
  filter?: Filter;
  staticEffect?: { kind: string; [key: string]: unknown };
  duration?: EffectDurationRef;
  /**
   * The name alias is valid ONLY during DigiXros material-slot matching. It must not appear in
   * `effectiveNames()` or any ordinary name filter (KB Q3068, Q3105, Q3119). Implied by
   * `grant === "nameForDigiXros"`.
   */
  digiXrosOnly?: boolean;
}
