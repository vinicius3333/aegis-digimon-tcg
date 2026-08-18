// Security-stack manipulation and security-battle modifiers.

import type { ActionBase } from "./base.js";
import type { Action } from "./index.js";
import type { EffectDurationRef } from "../durations.js";
import type { Controller, Filter, Target, ZoneRef } from "../filters.js";
import type { Condition } from "../predicates.js";

/** Ask the opponent whether to trash their top security card and remember a decline. */
export interface OpponentMayTrashSecurityAction extends ActionBase {
  kind: "OpponentMayTrashSecurity";
}

export interface SecurityAttackInvertAction extends ActionBase {
  kind: "SecurityAttackInvert";
  /** The permanent(s) whose existing ＜Security Attack ±N＞ grants have their sign inverted. */
  target: Target;
  duration: EffectDurationRef;
}

/**
 * Suppress the [Security] effect of a flipped security card while the SOURCE permanent
 * `cardEffect.IsSecurityEffect` and `AttackingPermanent == self`). `target` resolves to
 * the ATTACKING permanent the disable is attached to (normally the source itself, NOT
 * the opponent) — when that permanent is the attacker, a revealed security card's
 * [Security] effect does not activate (the card is still trashed per KB Q886).
 * `sourceKind` distinguishes the Option-only form (BT1-025: suppress only Option
 * security effects) from the any-source form (EX6-010/EX3-073: suppress any security
 * effect). Recorded on the continuous security-effect-disable ledger and consulted in
 * the security-check resolution loop. This is the security half of the source
 * "can't activate effects" split (the timing half is `DisableTimingEffect`).
 */
export interface DisableSecurityEffectAction extends ActionBase {
  kind: "DisableSecurityEffect";
  /** The attacking permanent the disable is attached to (defaults to the source/self). */
  target: Target;
  /** "option" suppresses only Option security effects; "any" suppresses any. */
  sourceKind: "option" | "any";
  duration: EffectDurationRef;
}

/**
 * "All of your opponent's Security Digimon get -N DP" — a DP modifier applied to
 * the Digimon cards in a security stack during a security check (the common
 * negative-DP-to-security shape). Modeled separately from ModifyDP because the
 * affected cards are not battle-area permanents.
 */
export interface ModifySecurityDPAction extends ActionBase {
  kind: "ModifySecurityDP";
  /** Whose security stack. */
  controller: Controller;
  amount: number; // signed
  duration: EffectDurationRef;
}

export type SecurityOp =
  | "shuffle" // "shuffle your security stack"
  | "trashTop" // "trash the top card of your opponent's security stack"
  | "trash" // alias for trashTop — "trash top security card" (BT18-101; semantically identical to trashTop)
  | "toHand" // "add your top/bottom security card to the hand"
  | "placeAsSecurity" // "place <X> as/on (top/bottom of) security stack"
  | "flipFaceUp" // "flip <controller>'s top face-down security card face up"
  | "addTop" // "add to the top of security"
  | "addBottom" // "add to the bottom of security"
  | "addTopOrBottom" // "add to the top or bottom of security"
  | "flipUp" // "flip face up"
  | "revealTop" // "reveal the top card of the security stack" (stays in security, face up)
  | "revealBottom" // "reveal the bottom card of the security stack"
  | "lookAndMayAddToHand"; // look at top security, optionally add it to hand, then run the matching branch (BT9-034)

export interface SecurityManipulationAction extends ActionBase {
  kind: "SecurityManipulation";
  op: SecurityOp;
  /** Whose security stack the op targets. */
  controller: Controller;
  /**
   * For effects where the affected player may choose whether to perform the security action
   * ("your opponent may trash their top security card" — BT19-094). This is intentionally
   * separate from ActionBase.optional, which always prompts the effect controller.
   */
  optionalFor?: Controller;
  /** True for "both players' security" — the op applies to each player's stack. */
  bothPlayers?: boolean;
  /** For trashTop: how many cards (default 1). */
  amount?: number;
  /** For trashTop: trash enough top cards to leave this many cards in the targeted security stack. */
  leaveCount?: number;
  /** For trashTop: controller chooses any amount from 0 through the computed maximum. */
  upTo?: boolean;
  /** For placeAsSecurity: which cards are placed. */
  source?: Target | "securityTop" | "deck" | "deckTop" | "revealed" | "reveal" | "rest" | "hand" | "handOrTrash";
  /** For placeAsSecurity: from which zone the placed cards come. */
  from?: ZoneRef[];
  /** For placeAsSecurity: top (default) or bottom of the stack. */
  toTop?: boolean;
  /** Position in the security stack: "top", "bottom". */
  position?: string;
  /**
   * For toHand: choose the card(s) from the whole security stack rather than taking top/bottom.
   * This models "look at your security stack, reveal 1 card, and add it to your hand" effects
   * such as BT1-087, where downstream branches need the exact moved card via `bindResultAs`.
   */
  chooseFromSecurity?: boolean;
  /** Restricts the selectable cards for `chooseFromSecurity` by their definitions. */
  selectionFilter?: Filter;
  /**
   * For placeAsSecurity ONLY: place the card(s) FACE UP in the security stack
   * (BT25-102's "place this card face up as the bottom security card"). A face-up
   * security card stays revealed to both players but otherwise behaves as normal
   * security (KB BT25-102 Q6484-6487); a shuffle re-hides it. Absent/false => the
   * normal face-down placement. Must NOT be set for non-security placements, so it
   * never enters the structural signature for ordinary placeAsSecurity matching.
   */
  faceUp?: boolean;
  /**
   * For placeAsSecurity: detach only the source permanent's current top card and promote the
   * top digivolution card, leaving the permanent in play. BT9-044 uses this as a deletion-
   * prevention cost. Requires at least 1 digivolution card.
   */
  detachPermanentTop?: boolean;
  /**
   * For addBottom/addTop: take the card from the TOP of the SOURCE permanent's digivolution
   * stack (the card directly beneath the top) and add it to the security stack, face-up when
   * `faceUp` is also set. BT20-055 "place the top card of this Digimon face-up at the bottom
   * of your security stack." The source permanent is resolved via `source.filter`. Absent/false
   * => the normal card-resolution path.
   */
  fromDigivolutionTop?: boolean;
  /**
   * After the trash/move op, store the set of affected card instance ids under this binding name.
   * A downstream action's `condition.bindingEmpty` checks if the binding is empty
   * (i.e. nothing was actually trashed — e.g. opponent had no security). BT18-101 EndOfAllTurns.
   */
  bindResultAs?: string;
  /** Store the number of security cards moved by this action for a later scaling action. */
  trackCount?: string;
  /** Actions to run after the looked-at security card is added to hand. */
  ifAddedToHand?: Action[];
  /** Actions to run when the controller leaves the looked-at card in security. */
  ifNotAddedToHand?: Action[];
  /**
   * A condition checked AFTER the action's cost is paid, gating only the security op itself —
   * distinct from `ActionBase.condition`, which is checked BEFORE the cost and would wrongly
   * block paying it. Models "By [cost], if [condition], ＜Recovery +N＞" where the cost is payable
   * regardless of the condition and the condition reads state that only holds true post-cost
   * (EX9-029 "if you have as many or fewer security cards as this Digimon has face-down
   * digivolution cards" — KB Q4783: you may still pay the cost even when the condition fails).
   */
  postCostCondition?: Condition;
}

/**
 * "By trashing the top security card of 1 player with the most security cards, ＜Recovery +N＞."
 * (ST23-05.) The controller may trash one eligible player's top security (a player whose security
 * count is > 0 and >= the other player's — choosing which when tied, KB Q6167) or decline; on a
 * trash, the source's owner gains ＜Recovery +N＞ (top N of their deck to the top of their security).
 */
export interface RecoverByTrashingMostSecurityAction extends ActionBase {
  kind: "RecoverByTrashingMostSecurity";
  /** ＜Recovery +N＞ (default 1). */
  amount?: number;
}

/**
 * "Trash the top N card(s) of <controller>'s security stack."
 * A standalone action (not a cost) that trashes from the specified player's security.
 * The optional `condition` gates whether the trash actually occurs (evaluated before trashing).
 * (CAP-E15, BT21-052 — trashes opponent's top security as part of a SubTrigger body.)
 */
export interface TrashSecurityTopAction extends ActionBase {
  kind: "trashSecurityTop";
  /** Whose security to trash from. */
  controller: Controller;
  /** How many cards to trash from the top (default 1). */
  count?: number;
}
