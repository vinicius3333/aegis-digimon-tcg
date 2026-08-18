// Restrictions placed on players, cards, and effects.

import type { ActionBase } from "./base.js";
import type { EffectDurationRef } from "../durations.js";
import type { Controller, Filter, Target } from "../filters.js";

/** What a continuous restriction forbids the target from doing. */
export type RestrictionKind =
  | "attack" // "can't attack"
  | "attackPlayers" // "can't attack players"
  | "cantAttackDigimon" // "can't attack Digimon" (players remain legal targets)
  | "block" // "can't block"
  | "cantBeBlocked" // "can't be blocked" (GainCanNotBlockPlayerEffect) — restriction on the ATTACKER
  | "suspend" // "can't suspend"
  | "unsuspend" // "doesn't unsuspend"
  | "beDeletedInBattle" // "can't be deleted in battle"
  | "beDeleted" // "can't be deleted"
  | "beTrashed"
  | "beReturned" // "can't be returned to hand/deck"
  | "digivolve" // "can't digivolve"
  | "digivolveToLevel7" // "can't digivolve to level 7" (EX3-069, including DNA digivolution)
  | "digivolveExceptInto" // POSITIVE constraint: "this Digimon can only digivolve into [X]" (EX10-035; carries an into-filter, recorded via RestrictDigivolveInto and read by digivolve-legality)
  | "attackTargetChange" // "attack target can't change"
  | "cantBeAttacked" // "can't be attacked" (GainCanNotBeAttacked) — restriction on the DEFENDER
  | "dpImmune"
  | "beAffected" // "unaffected by your opponent's effects" (DigimonEffectImmunity / CanNotAffected)
  | "cantBeDeDigivolved"
  | "cannotActivateWhenDigivolving" // "can't activate [When Digivolving] effects" (BT19-038 KB Q5541–Q5545)
  // DEPRECATED — inert. The two distinct "can't activate effects" mechanics are now their own
  // actions (DisableSecurityEffectAction / DisableTimingEffectAction). Still emitted by the older
  // runtime record output for ~32 cards pending re-classification; left in the union so those records
  // type-check. No engine site consults it (it never had a consumer).
  | "activateEffects";

/**
 * A continuous "can't ..." restriction applied to a target while the effect is
 * active. The engine records it in the continuous-effect layer; combat/turn code
 * reads it.
 */
export interface RestrictAction extends ActionBase {
  kind: "Restrict";
  target: Target;
  /** What the target is restricted from doing. */
  restriction: RestrictionKind | string;
  /** The permanent the restriction is ON (defaults to the restriction's source). */
  on?: Target;
  duration: EffectDurationRef;
  /**
   * When set, a `beAffected` immunity blocks ONLY effects whose source card is
   * one of these kinds (e.g. `["Digimon"]` for "opponent's Digimon effects don't
   * affect this Digimon"). Absent means block regardless of source (default behavior).
   */
  fromSourceKind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /**
   * When true, the prohibition applies only while the restricted permanent's OPPONENT
   * controls the resolving effect — the "…by your opponent's effects" wording. Absent
   * means the prohibition applies to any effect ("effects can't delete or trash it").
   */
  byOpponentEffectsOnly?: boolean;
}

/**
 * Seat-level, state-sensitive digivolution prohibition: while active, the restricted player's
 * unsuspended Digimon can't digivolve. Suspended Digimon remain legal, as do Tamers that use a
 * direct named Tamer digivolution requirement; a Tamer used "as if it were a Digimon" is blocked.
 * EX3-053 Metallicdramon, Q3420-Q3422.
 */
export interface RestrictUnsuspendedDigivolveAction extends ActionBase {
  kind: "RestrictUnsuspendedDigivolve";
  seat: Controller;
  duration: EffectDurationRef;
}

/**
 * Positive digivolve-target constraint (EX10-035 "[All Turns] This Digimon can only digivolve
 * `digivolveExceptInto` restriction on the target carrying the ALLOWED into-filter; the
 * digivolve-legality check rejects a digivolve onto the restricted permanent unless the evolving
 * card matches `into`. Distinct from the plain `digivolve` ("can't digivolve at all") restriction.
 */
export interface RestrictDigivolveIntoAction extends ActionBase {
  kind: "RestrictDigivolveInto";
  /** The permanent(s) whose digivolve target is constrained (usually the source). */
  target: Target;
  /** The ONLY card(s) this permanent may digivolve into (matched against the evolving card). */
  into: Filter;
  duration: EffectDurationRef;
}

/**
 * Continuous "can't have less than N DP" floor (EX11-070's [All Turns] inherited
 * layer AFTER all +/- changes are summed (KB EX11-070 Q5941: original 5000 +2000 −7000 →
 * clamped to 1000, NOT a per-change clamp), distinct from a `ModifyDP` delta. Records a
 * floor on the target permanent; `recomputeDP`/`rawDp` raise the computed DP up to the
 * highest active floor. Cleared and re-derived each continuous-recompute pass (CR-01).
 */
export interface MinDpFloorAction extends ActionBase {
  kind: "MinDpFloor";
  /** The permanent(s) the floor applies to (the host of an inherited effect). */
  target: Target;
  /** The minimum DP the target may have (EX11-070 → 1000). */
  floor: number;
  duration: EffectDurationRef;
}

/**
 * Continuous "this Digimon's stacked cards can't be trashed by your opponent's effects"
 * KB Q5943). Prevents the OPPONENT's effects from trashing the target's stacked digivolution
 * cards (TrashDigivolution and `<De-Digivolve>`). The controller's OWN effects are unaffected
 *. Recorded on the target permanent and consulted by
 * the digivolution-card trash sites; cleared and re-derived each continuous pass (CR-01).
 */
export interface StackTrashLockAction extends ActionBase {
  kind: "StackTrashLock";
  /** The permanent whose stacked cards are protected (the host of an inherited effect). */
  target: Target;
  duration: EffectDurationRef;
}

/**
 * Seat-level memory gain lock (rule implementation): the affected seat may not
 * gain memory from non-Tamer effects while active.
 */
export interface RestrictMemoryGainAction extends ActionBase {
  kind: "RestrictMemoryGain";
  /** Whose memory gain is restricted (from the source card owner's perspective). */
  seat: Controller;
  exceptTamerEffects: true;
  duration: EffectDurationRef;
}

/**
 * Seat-level prohibition on reducing play or digivolve costs (rule implementation).
 */
export interface RestrictCostReductionAction extends ActionBase {
  kind: "RestrictCostReduction";
  seat: Controller;
  costType: "play" | "digivolve" | "all";
  duration: EffectDurationRef;
}

/**
 * Seat-level prohibition on PLAYING / MOVING cards matching a filter (rule implementation /
 * rule implementation / rule implementation). "Your opponent can't use Option cards" /
 * "your opponent can't play or move Digimon with 6000 DP or less". The restriction
 * affects only the RESTRICTED seat's OWN actions/effects — a card matching the filter
 * cannot be played/moved by an action or an effect attributed to that seat; the SOURCE
 * player's effects may still play such a card into the restricted seat's area (KB
 * EX7-014 Q4675/Q4676). Token plays are EXEMPT (Q3834); breeding-area plays and
 * effect-driven moves ARE blocked (Q3835/Q6509). Delay/Security activations of Option
 * cards already in play are NOT "playing" and are unaffected (BT8-057 Q1736/Q1737,
 * EX1-072 Q3265/Q3266). Recorded on the continuous play-prohibition ledger and consulted
 * by play-card / breeding-move legality and effect-driven plays.
 */
export interface RestrictPlayAction extends ActionBase {
  kind: "RestrictPlay";
  /** Whose plays/moves are restricted (from the source card owner's perspective). */
  seat: Controller;
  /** Which cards the prohibition matches (kind Option; or kind Digimon + dpAtMost). */
  filter: Filter;
  /** "play" (rule implementation/rule implementation), "move" (rule implementation), or both. */
  mode: "play" | "move" | "playOrMove";
  /**
   * When true, the prohibition applies only to effect-driven plays (not normal hand play).
   * Consulted at the effect-play gate; bypassed by the normal play-card action gate.
   * Confirmed by KB Q&A Q4665–Q4668 and Q6245 (BT20-020).
   */
  byEffectOnly?: boolean;
  duration: EffectDurationRef;
}

/** Seat-wide prohibition on adding cards to security through one player's effects. */
export interface GlobalRestrictAction extends ActionBase {
  kind: "GlobalRestrict";
  restriction: "opponentCannotAddToSecurity";
  duration: EffectDurationRef;
}

/**
 * A continuous immunity grant: the target cannot be chosen by and is unaffected by any
 * effect from the opponent while the condition holds. Stored as a `beAffected` restriction
 * on the continuous-effect layer (CAP-C-06, BT19-101).
 */
export interface GrantImmunityAction extends ActionBase {
  kind: "GrantImmunity";
  target: Target;
  /** Which effect category to block. "opponentEffects" = all opponent-controlled effects. */
  immuneFrom: "opponentEffects" | string;
  duration: EffectDurationRef;
}
