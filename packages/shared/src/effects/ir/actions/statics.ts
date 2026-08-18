// Continuous grants: auras, static modifiers, and effect disabling.

import type { ActionBase } from "./base.js";
import type { Action } from "./index.js";
import type { RestrictionKind } from "./restrictions.js";
import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters.js";
import type { KeywordRef } from "../keywords.js";
import type { Condition } from "../predicates.js";

/**
 * Grant a debuff aura to all opponent Digimon (P-075 rule implementation pattern).
 * Installs a SubTrigger watcher on each opponent permanent that matches the filter.
 * The aura fires when the watcher's event occurs and runs the aura's actions.
 */
export interface GrantAuraToOpponentsAction extends ActionBase {
  kind: "GrantAuraToOpponents";
  /** Filter for eligible opponent permanents (default: all Digimon). */
  filter?: Filter;
  /** Alternative: target specification for the aura. */
  target?: Target;
  /** The SubTrigger event the aura watches. */
  event: string;
  /** Actions to run when the aura fires. */
  actions: Action[];
  /** Duration the aura lasts. */
  duration: EffectDurationRef;
  /** Effect text for the aura (used by the GRANTEFFECT pattern). */
  effectText?: string;
}

/** The timing windows a `DisableTimingEffect` can suppress on a target permanent. */
export type DisableTiming = "whenDigivolving" | "whenAttacking" | "onPlay";

/**
 * Suppress a TARGET permanent's [When Digivolving] / [When Attacking] / [On Play]
 * on `cardEffect.IsWhenDigivolving | IsWhenAttacking | IsOnPlay`, honoring the
 * `!TopCard.CanNotBeAffected(invalidationClass)` effect-immunity gate). `target`
 * resolves to the suppressed permanents (usually the opponent's Digimon); `timings`
 * is which timing windows are masked. Recorded on the continuous timing-effect-disable
 * ledger and consulted by the per-effect activation gate so a masked effect does not
 * fire — unless the source permanent carries the `beAffected` immunity. This is the
 * timing half of the source "can't activate effects" split (the security half is
 * `DisableSecurityEffect`).
 */
export interface DisableTimingEffectAction extends ActionBase {
  kind: "DisableTimingEffect";
  /** The permanents whose timing effects are suppressed. */
  target: Target;
  /** Which timing windows are masked. */
  timings: DisableTiming[];
  duration: EffectDurationRef;
}

/**
 * A static/aura effect with a DYNAMIC duration: it applies WHILE its `condition`
 * IsExistOnBattleArea, is implicit). The classic shape is "[Your Turn] While you
 * have a blue Tamer in play, this Digimon gains ＜Jamming＞" — modeled NOT as a
 * once-per-turn event with a permanent grant (which never expires when the
 * condition fails), but as an aura whose effect is live exactly while the gate is
 * true. `effect` is the single conferred behavior (a keyword grant, a DP modifier,
 * or a restriction); the continuous layer re-checks `condition` each evaluation.
 */
export interface AuraAction extends ActionBase {
  kind: "Aura";
  /** Whose / which permanents the aura affects (defaults to the source). */
  target: Target;
  /** The conferred continuous behavior. */
  effect:
    | { kind: "keyword"; keyword: KeywordRef }
    | { kind: "modifyDP"; amount: number }
    | { kind: "modifySecurityDP"; amount: number; seat?: "mine" | "opponent" }
    | { kind: "securityAttack"; amount: number }
    | { kind: "restriction"; restriction: RestrictionKind };
  /** The gate that must hold for the aura to be live (re-evaluated continuously). */
  while: Condition;
}

/**
 * A static name/trait grant ("also treated as [X]", "this Digimon gains all
 * effects of cards with [X] in their digivolution cards"). Resolved by the
 * continuous-effect layer against the card DB.
 */
export interface GrantStaticAction extends ActionBase {
  kind: "GrantStatic";
  target: Target;
  /**
   * "name"/"trait" => add an alias; "effects" => inherit effects of matching stack cards.
   * "immuneToOpponentOptionEffects" => the target Digimon is not affected by opponent Option
   * card effects for the duration (CAP-A8, BT19-089; stored as beAffected+fromSourceKind:Option).
   */
  grant: "name" | "nameForDigiXros" | "trait" | "effects" | "kinds" | "immuneToOpponentOptionEffects" | string;
  /** The granted tokens (from `[X]` refs) or the source filter for "effects". */
  tokens?: string[];
  filter?: Filter;
  /** Static effect specification (for object-shaped grants). */
  staticEffect?: { kind: string; [key: string]: unknown };
  /** Duration of the grant. */
  duration?: EffectDurationRef;
  /**
   * When true (or when `grant === "nameForDigiXros"`), the name alias is ONLY valid
   * during DigiXros material-slot matching. It must NOT appear in effectiveNames() or
   * any ordinary name filter (KB Q3068, Q3105, Q3119).
   */
  digiXrosOnly?: boolean;
}
