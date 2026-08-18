// Board-state manipulation: suspend state, DP, keywords, and movement.

import type { ActionBase } from "./base.js";
import type { Action } from "./index.js";
import type { EffectDurationRef } from "../durations.js";
import type { Controller, Filter, Target } from "../filters.js";
import type { KeywordRef } from "../keywords.js";
import type { Cost } from "../predicates.js";

export interface HandManipulationAction extends ActionBase {
  kind: "HandManipulation";
  op: "trashVariable";
  controller?: Controller;
  amount: number | "variable";
  /** Who picks which hand card(s) are trashed. See `TrashAction.chooser` for the full rationale. */
  chooser?: "controller" | "opponent";
}

export interface SuspendAction extends ActionBase {
  kind: "Suspend";
  target: Target;
  /**
   * When set, the interpreter stores the number of permanents actually suspended
   * (truely affected, not just targeted) under this name in `EffectContext.namedCounts`
   * so a subsequent `RepeatPerCount` action can loop that many times (BT2-041).
   */
  trackCount?: string;
  /**
   * Bind the ids actually suspended under this name in `EffectContext.boundPlayed`, so a later
   * action can reference "the Digimon this effect suspended" (mirrors `Return`/`PlayFromZone`).
   * Unlike the `sameTarget` workaround (which reuses `lastResolvedPermanentIds`), a real bind is
   * empty when suspension resolves 0 permanents — the downstream restriction then applies to
   * nothing, matching KB Q4791/Q4792 (EX9-037/038, BT9-056 edge case).
   */
  bindResultAs?: string;
}

/**
 * Execute a nested `action` once for each unit stored in the named counter written
 * by a prior `trackCount` action (BT2-041: repeat ModifyDP once per suspended Tamer).
 * Each iteration performs independent target selection ("a SEPARATE activation per
 * Tamer" — KB Q1014). `countSource` is the same name used in the prior `trackCount`.
 */
export interface RepeatPerCountAction extends ActionBase {
  kind: "RepeatPerCount";
  /** Name written by the prior `trackCount` action in `EffectContext.namedCounts`. */
  countSource: string;
  /** Alternatively derive the repeat count directly from the current board/zones. */
  countFilter?: Filter;
  /** The action to execute on each iteration (independent target selection per loop). */
  action: Action;
}

/**
 * Move a whole permanent (top card + digivolution stack + linked cards) across the
 * breeding/battle boundary as a card EFFECT — NOT the once-per-turn breeding-phase
 * player action. The permanent keeps its identity, stack, linked cards, and suspended
 * state; digivolution cards are NOT trashed and ＜Overflow＞ is NOT processed
 * (Comprehensive Rules §4-16 "Moving"; KB P-143 Q4250/Q4251/Q4256/Q4257, P-130 Q4242).
 *   - "toBreeding": the (self) target leaves the battle area for the empty breeding slot
 *     (P-143 [End of Your Turn]). `target` is the self permanent.
 *   - "toBattle": a chosen breeding-area Digimon moves to the battle area (P-130 [On
 *     Play]); `target` carries the eligibility filter (your breeding Digimon, level ≥ 3).
 */
export interface MovePermanentAction extends ActionBase {
  kind: "MovePermanent";
  direction: "toBreeding" | "toBattle";
  target?: Target;
}

/**
 * "Hatch a Digi-Egg" as a card EFFECT (BT8-091 [On Play]): flip the top card of the
 * controller's Digi-Egg deck into the EMPTY breeding slot as a fresh permanent
 * (Comprehensive Rules §4-17-1). The interpreter resolves this through the `hatch`
 * primitive (the Digi-Egg-deck seam `placeUnder`/loose-card helpers cannot serve).
 * No target — hatching is always into the controller's own breeding area.
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
  amount: number; // signed
  duration: EffectDurationRef;
  /** Override continuous-pass inference for audited edge cases with a triggered duration. */
  continuous?: boolean;
}

/**
 * Suspend a Digimon as an activation cost, then add that Digimon's current DP
 * to the target for the current attack and grant any listed attack keywords.
 * This is the declarative form of Alliance-like "adds the suspended Digimon's
 * DP" effects (EX4-029/035/054).
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
 * Set a permanent's ORIGINAL/base DP to an absolute value (distinct from the
 * signed-delta ModifyDP). The override REPLACES the printed base DP; signed DP
 * deltas from other effects layer on top of it, and between competing overrides
 * the most recently applied wins. KB: BT3-014 Q1056/Q1057 ("treated as 1000 DP",
 * a coexisting -1000 → 0 → deletion), BT22-007 Q4864 (16000 then -3000 → 13000),
 * Q4865 (a later original-DP override of 3000 → 3000).
 */
export interface SetBaseDPAction extends ActionBase {
  kind: "SetBaseDP";
  target: Target;
  value: number; // absolute base DP
  duration: EffectDurationRef;
}

export interface GainKeywordAction extends ActionBase {
  kind: "GainKeyword";
  target: Target;
  keyword: KeywordRef;
  duration: EffectDurationRef;
  /**
   * How many times the keyword is granted to each target. Defaults to 1.
   * Used by BT19-091 ("gains ＜Alliance＞ twice") — each extra grant adds one
   * additional security check when the keyword is Alliance.
   */
  count?: number;
  /**
   * Keep the grant active only while its recipient continues to match the original
   * target filter. Used by effects such as Beast Cyclone: losing Blocker/Reboot after
   * digivolution also removes the granted Security Attack bonus (KB Q1144).
   */
  whileMatchesTargetFilter?: boolean;
}

/** "Add this card to its owner's hand" (self), e.g. a security card returning to hand. */
export interface AddToHandSelfAction extends ActionBase {
  kind: "AddToHandSelf";
}

/** "Place this card in the battle area" (self), e.g. a security Digimon entering play. */
export interface PlaceInBattleAreaSelfAction extends ActionBase {
  kind: "PlaceInBattleAreaSelf";
  /** Zone to place the card from/to. */
  zone?: string;
  /** Target specification (alternative to self). */
  target?: Target;
}
