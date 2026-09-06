// Security-stack manipulation and security-battle modifiers.

import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters/filter.js";
import type { Controller, ZoneRef } from "../filters/zones.js";
import type { Condition } from "../predicates/conditions.js";
import type { Scaling } from "../predicates/scaling.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";

/** Ask the opponent whether to trash their top security card, remembering a decline. */
export interface OpponentMayTrashSecurityAction extends ActionBase {
  kind: "OpponentMayTrashSecurity";
}

export interface SecurityAttackInvertAction extends ActionBase {
  kind: "SecurityAttackInvert";
  /** Whose existing ＜Security Attack ±N＞ grants have their sign inverted. */
  target: Target;
  duration: EffectDurationRef;
}

/**
 * Suppress a flipped security card's [Security] effect while the attached permanent is the
 * ATTACKER — normally the source itself, not the opponent. The card is still trashed (KB Q886).
 * `sourceKind` separates the Option-only form (BT1-025) from the any-source form (EX6-010,
 * EX3-073). This is the security half of the "can't activate effects" split; the timing half is
 * `DisableTimingEffect`.
 */
export interface DisableSecurityEffectAction extends ActionBase {
  kind: "DisableSecurityEffect";
  /** Defaults to the source. */
  target: Target;
  sourceKind: "option" | "any";
  /** Apply to every attacker controlled by the source owner, rather than one resolved permanent. */
  scope?: "seat";
  duration: EffectDurationRef;
}

/**
 * "All of your opponent's Security Digimon get -N DP" — a DP modifier on the Digimon cards in a
 * security stack during a security check. Separate from ModifyDP because the affected cards are
 * not battle-area permanents.
 */
export interface ModifySecurityDPAction extends ActionBase {
  kind: "ModifySecurityDP";
  controller: Controller;
  /** Signed. */
  amount: number;
  duration: EffectDurationRef;
}

export type SecurityOp =
  | "shuffle"
  | "trashTop"
  | "trash" // alias for trashTop (BT18-101)
  | "toHand" // top or bottom security card to hand
  | "placeAsSecurity"
  | "placeFromDeck" // the top deck card onto the top/bottom of security
  | "flipFaceUp"
  | "addTop"
  | "addBottom"
  | "addTopOrBottom"
  | "flipUp"
  | "revealTop" // stays in security, face up
  | "revealBottom"
  | "lookAndMayAddToHand" // look, optionally take, then run the matching branch (BT9-034)
  | "moveTopToBottom"
  | "revealAllChooseToDeckTopShuffleRest";

export interface SecurityManipulationAction extends ActionBase {
  kind: "SecurityManipulation";
  op: SecurityOp;
  controller: Controller;
  /**
   * The AFFECTED player chooses whether to perform the op ("your opponent may trash their top
   * security card", BT19-094). Deliberately separate from `ActionBase.optional`, which always
   * prompts the effect controller.
   */
  optionalFor?: Controller;
  /** "both players' security" — the op runs on each stack. */
  bothPlayers?: boolean;
  /** For trashTop; default 1. */
  amount?: number;
  /** Eligible loose cards when adding security from hand or handOrTrash. */
  filter?: Filter;
  /** Compute the amount from a preceding action's named count (e.g. 7 minus deletions). */
  amountFromNamedCount?: { base: number; countSource: string; per: number; floor?: number };
  /** For trashTop: trash enough to leave this many cards in the stack. */
  leaveCount?: number;
  /** For trashTop: the controller picks any amount from 0 to the computed maximum. */
  upTo?: boolean;
  /** For trashTop: the effect controller chooses the top or bottom card. */
  chooseTopOrBottom?: boolean;
  /** For placeAsSecurity: which cards are placed. */
  source?:
    | Target
    | "securityTop"
    | "deck"
    | "deckTop"
    | "revealed"
    | "reveal"
    | "rest"
    | "hand"
    | "handOrTrash"
    | "lastOptionUsed";
  /** Raises a field-source DP ceiling for each matching scaling unit (ST21-06). */
  sourceDpCeilingScaling?: Scaling & { amount: number };
  /** For placeAsSecurity: which zone the placed cards come from. */
  from?: ZoneRef[];
  /** For placeAsSecurity; default top. */
  toTop?: boolean;
  /**
   * For placeAsSecurity with a FIELD source: place each card into ITS OWNER's security stack
   * rather than the single `controller` stack ("on top of its owner's security stack" — LM-020).
   */
  ownerSecurity?: boolean;
  /**
   * For placeAsSecurity from a LOOSE zone: reveal the chosen card to the opponent before it goes
   * face down onto the stack (LM-023 Q4025).
   */
  revealChosen?: boolean;
  position?: string;
  /**
   * For toHand: choose from the whole stack rather than taking top or bottom ("look at your
   * security stack, reveal 1 card, and add it to your hand" — BT1-087), so downstream branches
   * can read the exact moved card via `bindResultAs`.
   */
  chooseFromSecurity?: boolean;
  /** Narrows the selectable cards for `chooseFromSecurity`. */
  selectionFilter?: Filter;
  /** For toHand: take the first face-down card scanning from the requested edge. */
  faceDownOnly?: boolean;
  /**
   * For placeAsSecurity only: place FACE UP (BT25-102). A face-up security card stays revealed
   * but otherwise behaves normally, and a shuffle re-hides it (KB Q6484-6487). Never set for
   * non-security placements, so it stays out of the structural signature for ordinary matching.
   */
  faceUp?: boolean;
  /** For addTop/addBottom/addTopOrBottom: explicitly return a revealed card face down. */
  faceDown?: boolean;
  /** Maximum security size for recovery-like add operations. */
  maxSecurity?: number;
  /**
   * For security placement: detach only the source's current top card, promoting the top
   * digivolution card and leaving the permanent in play. BT9-044 uses it as a deletion-prevention
   * cost. Requires at least one digivolution card.
   */
  detachPermanentTop?: boolean;
  /**
   * For addBottom/addTop/placeAsSecurity: take the card directly beneath the source's top card
   * and add it to security, face-up when `faceUp` is also set (BT20-084, BT24-093). The source
   * is resolved via `source.filter`.
   */
  fromDigivolutionTop?: boolean;
  /**
   * Store the affected instance ids so a downstream `condition.bindingEmpty` can tell whether
   * anything actually moved — e.g. the opponent had no security (BT18-101).
   */
  bindResultAs?: string;
  /** Store how many security cards moved, for a later scaling action. */
  trackCount?: string;
  /** For lookAndMayAddToHand. */
  ifAddedToHand?: Action[];
  /** For lookAndMayAddToHand. */
  ifNotAddedToHand?: Action[];
  /**
   * Checked AFTER the cost is paid, gating only the security op. `ActionBase.condition` is
   * checked BEFORE the cost and would wrongly block paying it. Models "By [cost], if [condition],
   * ＜Recovery +N＞" where the cost is payable either way and the condition reads post-cost state
   * (EX9-029; KB Q4783).
   */
  postCostCondition?: Condition;
}

/**
 * "By trashing the top security card of 1 player with the most security cards, ＜Recovery +N＞"
 * (ST23-05). The controller may trash one eligible player's top security — count > 0 and >= the
 * other player's, choosing which when tied (KB Q6167) — or decline. On a trash, the source's
 * owner gains ＜Recovery +N＞.
 */
export interface RecoverByTrashingMostSecurityAction extends ActionBase {
  kind: "RecoverByTrashingMostSecurity";
  /** Default 1. */
  amount?: number;
  /** When false, only the most-security top-card trash happens; the recovery is modeled separately. */
  recover?: boolean;
}

export interface RecoverAction extends ActionBase {
  kind: "Recover";
  amount?: number;
  /** Repeat recovery until this many security cards exist or the deck is empty. */
  untilSecurityCount?: number;
}

/**
 * "Trash the top N card(s) of <controller>'s security stack" as a standalone action rather than a
 * cost. `ActionBase.condition` gates whether the trash happens (CAP-E15, BT21-052).
 */
export interface TrashSecurityTopAction extends ActionBase {
  kind: "trashSecurityTop";
  controller: Controller;
  /** Default 1. */
  count?: number;
}
