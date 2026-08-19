// Board-state manipulation: suspend state, DP, keywords, and movement.

import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters/filter.js";
import type { Controller } from "../filters/zones.js";
import type { KeywordRef } from "../keywords.js";
import type { Cost } from "../predicates/costs.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";

export interface HandManipulationAction extends ActionBase {
  kind: "HandManipulation";
  op: "trashVariable";
  controller?: Controller;
  amount: number | "variable";
  /** See `TrashAction.chooser` for the full rationale. */
  chooser?: "controller" | "opponent";
}

export interface SuspendAction extends ActionBase {
  kind: "Suspend";
  target: Target;
  /**
   * Store how many permanents were actually suspended — not merely targeted — so a following
   * `RepeatPerCount` can loop that many times (BT2-041).
   */
  trackCount?: string;
  /**
   * Bind the suspended ids in `EffectContext.boundPlayed` so a later action can reference "the
   * Digimon this effect suspended". Unlike the `sameTarget` workaround, which reuses
   * `lastResolvedPermanentIds`, a real bind is EMPTY when 0 permanents are suspended, so the
   * downstream restriction applies to nothing — matching KB Q4791/Q4792 (EX9-037/038, BT9-056).
   */
  bindResultAs?: string;
}

/**
 * Run a nested action once per unit in the counter a prior `trackCount` wrote (BT2-041: repeat
 * ModifyDP once per suspended Tamer). Each iteration selects targets independently — "a SEPARATE
 * activation per Tamer" (KB Q1014).
 */
export interface RepeatPerCountAction extends ActionBase {
  kind: "RepeatPerCount";
  /** The name written by the prior `trackCount`. */
  countSource: string;
  /** Alternatively derive the repeat count from the current board. */
  countFilter?: Filter;
  action: Action;
}

/**
 * Move a whole permanent — top card, digivolution stack, and linked cards — across the
 * breeding/battle boundary as a card EFFECT, not the once-per-turn breeding-phase player action.
 * Identity, stack, linked cards, and suspended state survive; digivolution cards are not trashed
 * and ＜Overflow＞ is not processed (Comprehensive Rules §4-16; KB P-143 Q4250/Q4251/Q4256/Q4257,
 * P-130 Q4242).
 *
 * `"toBreeding"` sends the self target to the empty breeding slot (P-143). `"toBattle"` brings a
 * chosen breeding Digimon out, with `target` carrying the eligibility filter (P-130).
 */
export interface MovePermanentAction extends ActionBase {
  kind: "MovePermanent";
  direction: "toBreeding" | "toBattle";
  target?: Target;
}

/**
 * "Hatch a Digi-Egg" as a card EFFECT (BT8-091): flip the top Digi-Egg-deck card into the EMPTY
 * breeding slot as a fresh permanent (Comprehensive Rules §4-17-1). Resolved through the `hatch`
 * primitive, since the Digi-Egg-deck `placeUnder`/loose-card helpers cannot serve. Always into the
 * controller's own breeding area, so there is no target.
 */
export interface HatchAction extends ActionBase {
  kind: "Hatch";
}

export interface UnsuspendAction extends ActionBase {
  kind: "Unsuspend";
  target: Target;
}

export interface ModifyDPAction extends ActionBase {
  kind: "ModifyDP";
  target: Target;
  /** Signed. */
  amount: number;
  duration: EffectDurationRef;
  /** Override continuous-pass inference for audited edge cases with a triggered duration. */
  continuous?: boolean;
}

/**
 * Suspend a Digimon as an activation cost, then add that Digimon's current DP to the target for
 * the current attack and grant any listed attack keywords — the declarative form of Alliance-like
 * effects (EX4-029/035/054).
 */
export interface AddDPFromSuspendedCostAction extends ActionBase {
  kind: "AddDPFromSuspendedCost";
  cost: Cost;
  dpSource: { kind: "suspendedTarget" };
  target: Target;
  duration: EffectDurationRef;
  alsoGainKeywords?: KeywordRef[];
}

/**
 * Set a permanent's base DP to an absolute value, unlike the signed-delta ModifyDP. The override
 * REPLACES the printed base; signed deltas layer on top, and the most recent override wins.
 * KB BT3-014 Q1056/Q1057 ("treated as 1000 DP", a coexisting -1000 → 0 → deletion),
 * BT22-007 Q4864 (16000 then -3000 → 13000), Q4865 (a later override of 3000 → 3000).
 */
export interface SetBaseDPAction extends ActionBase {
  kind: "SetBaseDP";
  target: Target;
  value: number;
  duration: EffectDurationRef;
}

export interface GainKeywordAction extends ActionBase {
  kind: "GainKeyword";
  target: Target;
  keyword: KeywordRef;
  /** Legacy compiler shape: several keywords granted in one action. */
  keywords?: KeywordRef[];
  duration: EffectDurationRef;
  /**
   * How many times each target gains the keyword; default 1. BT19-091 "gains ＜Alliance＞ twice"
   * — each extra Alliance grant adds one more security check.
   */
  count?: number;
  /**
   * Keep the grant only while its recipient still matches the original target filter. Beast
   * Cyclone: losing Blocker/Reboot after digivolution also drops the granted Security Attack
   * bonus (KB Q1144).
   */
  whileMatchesTargetFilter?: boolean;
}

/** "Add this card to its owner's hand", e.g. a security card returning to hand. */
export interface AddToHandSelfAction extends ActionBase {
  kind: "AddToHandSelf";
}

/** "Place this card in the battle area", e.g. a security Digimon entering play. */
export interface PlaceInBattleAreaSelfAction extends ActionBase {
  kind: "PlaceInBattleAreaSelf";
  zone?: string;
  /** Alternative to acting on self. */
  target?: Target;
}
