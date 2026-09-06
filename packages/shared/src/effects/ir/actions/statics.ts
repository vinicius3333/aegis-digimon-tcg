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
  /**
   * The SubTrigger event the aura watches, with the body it runs. Absent for the GRANTEFFECT
   * shell form, where `effectText` names the printed ability verbatim and the interpreter
   * resolves it through the granted-effect library instead.
   */
  event?: string;
  actions?: Action[];
  /** Defaults to `untilOpponentTurnEnd`. */
  duration?: EffectDurationRef;
  /** Effect text for the aura, used by the GRANTEFFECT pattern. */
  effectText?: string;
  /** Apply the same timed grant to matching opponents that enter after resolution. */
  includeLaterEntrants?: boolean;
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
  /** Overall processing follows all matching current and future permanents for this duration. */
  whileMatchesTargetFilter?: boolean;
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
  /** Optional gate re-evaluated continuously; omitted means continuously while the source exists. */
  while?: Condition;
}

/** A temporary change to a permanent's base DP, color, or original name. */
export interface OriginalCardInfoGrant {
  dp?: number;
  color?: string;
  originalName?: string;
}

/**
 * A static name/trait grant ("also treated as [X]", "gains all effects of cards with [X] in their
 * digivolution cards"), resolved by the continuous-effect layer against the card DB.
 */
export type GrantStaticObjectGrant =
  | {
      chooseColorOtherThan: string;
      allowedColors?: string[];
    }
  | {
      color: string;
      dp?: number;
      originalName?: string;
    }
  | {
      dp: number;
      color?: string;
      originalName?: string;
    }
  | {
      originalName: string;
      color?: string;
      dp?: number;
    }
  | {
      kind: "PreventSecurityActivation";
      cardType: "Option";
    }
  | {
      kind: "Protection";
      protections: string[];
      from?: "opponent";
    }
  | {
      kind: "TreatAsLevel";
      level: number;
      context: "DNADigivolution";
      intoNames?: string[];
    }
  | { cannotBeDeletedInBattle: true }
  | { keyword: "Unblockable" }
  | { keyword: "EndOfAttack"; targetFilter: { keyword: "OnDeletion" } }
  | { immunity: true }
  | { immuneToOpponentEffects: true }
  | {
      copyEffectsFromDigivolution: {
        filter: string;
        trigger?: string;
      };
    };

export interface GrantStaticAction extends ActionBase {
  kind: "GrantStatic";
  target: Target;
  /**
   * "name"/"trait" adds an alias; "effects" inherits the effects of matching stack cards;
   * "immuneToOpponentOptionEffects" stores a beAffected + fromSourceKind:Option restriction for
   * the duration (CAP-A8, BT19-089).
   */
  grant:
    | "name"
    | "nameForDigiXros"
    | "trait"
    | "effects"
    | "kinds"
    | "immuneToOpponentOptionEffects"
    | string
    | GrantStaticObjectGrant;
  /** Granted tokens from `[X]` refs. */
  tokens?: string[];
  /** The source filter for "effects". */
  filter?: Filter;
  /** For "effects" grants, confer only the matched cards' effects with this printed trigger (EX10-059). */
  copyTrigger?: string;
  /** For "effects" grants, omit inherited effects from the matched stack cards. */
  excludeInherited?: boolean;
  /** Copy only the highest matching digivolution card, as required by <Succession>. */
  topmostOnly?: boolean;
  staticEffect?: { kind: string; [key: string]: unknown };
  duration?: EffectDurationRef;
  /** Apply named granted effects to matching permanents that enter before the duration expires. */
  includeLaterEntrants?: boolean;
  /**
   * The name alias is valid ONLY during DigiXros material-slot matching. It must not appear in
   * `effectiveNames()` or any ordinary name filter (KB Q3068, Q3105, Q3119). Implied by
   * `grant === "nameForDigiXros"`.
   */
  digiXrosOnly?: boolean;
}
