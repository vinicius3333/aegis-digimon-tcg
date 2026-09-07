// Deleting, trashing, and returning cards.

import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters/filter.js";
import type { Controller, ZoneRef } from "../filters/zones.js";
import type { Scaling } from "../predicates/scaling.js";
import type { ActionBase } from "./base.js";

export interface DeleteAction extends ActionBase {
  kind: "Delete";
  /** Require a previously granted, unconsumed Delay keyword before this payload resolves. */
  requiresDelayArmed?: true;
  target: Target;
  /** Shorthand for controller-less targets. */
  controller?: Controller;
  /** Schedule the deletion for the owner's end-of-turn window. */
  at?: "endOfTurn";
  /** Store how many selected permanents were actually deleted. */
  trackCount?: string;
  /** Add to the target DP ceiling per unit counted. */
  dpCeilingScaling?: Scaling & { amount: number };
  /** Add to a total-DP deletion budget per live scaling unit. */
  totalDpCapScaling?: Scaling & { amount: number };
  /** Dynamically raise a printed play-cost ceiling on the delete target. */
  playCostCeiling?: {
    base: number;
    raise: number;
    per: number;
    filter: Filter;
    unit: "cards" | "digivolutionCards";
    raw?: string;
  };
}

export interface ReturnTopDigivolutionCardsAction extends ActionBase {
  kind: "ReturnTopDigivolutionCards";
  target: Target;
  /** Number of cards removed from the top of each complete Digimon stack, always leaving one. */
  cardsPerTarget: number;
  /** Bottom-stack return keeps the current top card in play (EX6-061). */
  position?: "top" | "bottom";
  order?: "any";
}

/** Trash current top cards and promote the remaining stack, always leaving one card. */
export interface TrashTopStackedCardsAction extends ActionBase {
  kind: "TrashTopStackedCards";
  target: Target;
  amount: number;
}

/** Delete one opponent Digimon for each distinct color in the source stack (EX9-074). */
export interface DeletePerColorAction extends ActionBase {
  kind: "DeletePerColor";
  source: "digivolutionCards";
  target: Target;
}

/**
 * Delete matching permanents until the remaining count equals a live resource count (BT19-094:
 * "until they have as many as the number of your security cards"). `target` is the pool to reduce.
 */
export interface DeleteUntilCountAction extends ActionBase {
  kind: "DeleteUntilCount";
  target: Target;
  untilCountSource: "mineSecurityCount";
  trackCount?: string;
  /** Store the returned card's level for a later levelEq/levelLte filter. */
  storeAs?: string;
}

/**
 * Delete opponent permanents up to a TOTAL play-cost budget (P-094). The player selects
 * sequentially until the budget runs out, then all selections are deleted in one batch, i.e. one
 * OnDestroyedAnyone window. The card computes the budget; the engine only enforces the cap.
 */
export interface DeleteBudgetAction extends ActionBase {
  kind: "DeleteBudget";
  filter: Filter;
  /** Maximum total printed play cost across the selection. */
  budget: number;
  /** "up to" — each pick may be declined. */
  upTo?: boolean;
  /** Minimum number of permanents that must be selected when the clause is mandatory. */
  minimum?: number;
  /**
   * Adds `scaling.budgetAdd` per `scaling.per` units counted. BT19-096 uses unit "security" with
   * `filter.faceUp` to add 2 per face-up security card.
   */
  scaling?: Scaling;
}

/** Delete opponent Digimon/Tamers selected from source-stack color clauses under one budget. */
export interface DeleteByStackColorBudgetAction extends ActionBase {
  kind: "DeleteByStackColorBudget";
  redFilter: Filter;
  blackFilter: Filter;
  budget: number;
}

/**
 * Reveal cards, choose one as a play-cost reference, delete opponent permanents up to that
 * card's printed cost, then return the revealed cards to the deck. The reference card itself is
 * never moved to hand, play, or trash — it only supplies the budget (BT14-067).
 */
export interface RevealChooseDeleteBudgetAction extends ActionBase {
  kind: "RevealChooseDeleteBudget";
  revealCount: number;
  revealController: "mine" | "opponent";
  /** Which revealed cards may serve as the budget reference. */
  chooseFilter: Filter;
  deleteFilter: Filter;
  upTo?: boolean;
  /**
   * Cap the NUMBER of deleted permanents once the budget is set. Absent keeps the total-budget
   * behavior (BT14-067); `1` encodes "delete 1 whose play cost is <= the chosen card's" (BT9-105).
   */
  deleteCount?: number;
  returnRevealed: "deckBottom" | "deckTop" | "deckTopOrBottom" | "trash";
  returnOrder?: "controllerChoice";
}

/**
 * Budget deletion by LEVEL (BT17-051). Like `DeleteBudget`, but the per-target price is the
 * candidate's printed LEVEL. The effective budget is `baseBudget` plus an optional
 * `scaling.budgetAdd`. `filter` should carry `hasLevel:true` to exclude Lv.- Digimon (KB Q2807).
 */
export interface DeleteLevelBudgetAction extends ActionBase {
  kind: "DeleteLevelBudget";
  filter: Filter;
  baseBudget: number;
  upTo?: boolean;
}

/**
 * Budget deletion by DP (BT19-011): any combination whose DP sums to at most `baseBudget`, plus
 * any active `AddToDPDeleteBudget` bonus, deleted in one batch. The deleted ids land on
 * `ctx.lastDeletedByThisEffectIds` so a later `scaling.filter.deletedByThisEffect` can count them
 * (CAP-A3).
 */
export interface DeleteByDPBudgetAction extends ActionBase {
  kind: "DeleteByDPBudget";
  target: Target;
  /** "up to N DP": the controller may stop below the budget (read by runDeleteByDPBudget). */
  upTo?: boolean;
  baseBudget: number;
  /**
   * Adds `per` DP for every card matching `filter` (BT19-011: +2000 per opponent Digimon). Note
   * `per` is an amount-per-card here, NOT the divisor `Scaling.per` means.
   */
  budgetBonus?: {
    per: number;
    filter?: Filter;
    unit?: "cards" | "selfDigivolutionCards";
    /** For "for every N cards" bonuses. Default 1. */
    perCount?: number;
  };
}

/**
 * Inherited continuous modifier (BT19-011): adds `amount` DP to the budget of any
 * `DeleteByDPBudget` run by the Digimon that inherited it. Copies stack. Stored via
 * `ctx.fx.addDpDeleteBudget`, read back through `ctx.fx.dpDeleteBudgetBonus`.
 */
export interface AddToDPDeleteBudgetAction extends ActionBase {
  kind: "AddToDPDeleteBudget";
  amount: number;
}

export interface TrashAction extends ActionBase {
  kind: "Trash";
  target: Target;
  /** Shorthand for controller-less targets. */
  controller?: Controller;
  /**
   * Store how many cards were ACTUALLY trashed in `EffectContext.namedCounts`, so a later
   * `dpCeilingModifier` or `RepeatPerCount` can scale by it (CAP-E12/E13, BT20-077).
   */
  trackCount?: string;
  /** Bind the trashed instance ids for a later condition or action in this resolution. */
  bindResultAs?: string;
  /**
   * Return the targets' digivolution cards to the bottom of the deck BEFORE trashing, instead of
   * letting them fall to the trash with the top card as ordinary deletion does (BT20-080).
   */
  returnDigivolutionCardsFirst?: boolean;
  /**
   * Who PICKS the discarded card for a `zone === "hand"` trash. `"controller"` (the default) is
   * "trash 1 of your opponent's cards in their hand" — the controller reaches in. `"opponent"` is
   * "your opponent trashes 1 card in their hand", where the hand's owner chooses (BT13-079,
   * BT19-075, BT4-088, EX6-046, EX6-049; KB-confirmed).
   *
   * Distinct from `target.filter.controller`, which only scopes WHICH hand the candidates come
   * from. Before this field, both phrasings compiled to the same shape and the interpreter always
   * prompted the controller, silently upgrading the opponent's own discard into a reach-in.
   */
  chooser?: "controller" | "opponent";
}

export interface ReturnAction extends ActionBase {
  kind: "Return";
  target: Target;
  to: "hand" | "deckTop" | "deckBottom";
  /** Let the controller arrange multiple returned cards. */
  order?: "any";
  /** Loose source zones when cards may come from more than one. */
  from?: ZoneRef[];
  /** "Return all its digivolution cards to the deck bottom, then return that Digimon". */
  returnDigivolutionCardsFirst?: boolean;
  /** Store returned instance ids for a downstream `bindingContains`/`bindingExists`. */
  bindResultAs?: string;
  /**
   * Store the returned card's printed LEVEL under this name, for a later `namedCount` read
   * ("delete an opposing Digimon of the same level", EX9-055). Distinct from `trackCount`,
   * which records how many cards moved.
   */
  storeAs?: string;
  /**
   * Store how many cards were ACTUALLY returned, for a later `unit: "namedCount"` scaling
   * ("gain 1 memory for each card returned", BT9-111). Re-counting a live filter instead would
   * overcount unrelated cards.
   */
  trackCount?: string;
  /** Raise the play-cost ceiling a return target must fall under. */
  playCostCeiling?: {
    base: number;
    raise: number;
    per: number;
    filter?: Filter;
    unit: Scaling["unit"];
    raw?: string;
  };
  /** Raise a return target's DP ceiling by a live scaling amount. */
  dpCeilingScaling?: Scaling & { amount: number };
}

/** Return Digi-Egg cards to the dedicated Digi-Egg deck (BT4-095). */
export interface ReturnToEggDeckAction extends ActionBase {
  kind: "ReturnToEggDeck";
  target: Target;
  from?: ZoneRef[];
}

/**
 * Install a delayed self-delete on the permanent this effect just played (EX10-035). Binds the
 * played-id result and deletes it at the owner's turn end via the `endOfTurn` SubTrigger fired
 * alongside OnEndTurn, then expires.
 */
export interface DelayedDeletePlayedAction extends ActionBase {
  kind: "DelayedDeletePlayed";
  /** Boundary at which the played permanent is deleted; defaults to the owner's turn end. */
  timing?: "endOfOwnerTurn" | "endOfOpponentTurn";
}

export interface DelayedDeleteAction extends ActionBase {
  kind: "DelayedDelete";
  target?: Target;
  timing?: "endOfOwnerTurn" | "endOfOpponentTurn";
}

/**
 * "Add N to the maximum DP you can choose with DP-based deletion effects". Per KB Q2721/Q2722 it
 * raises a PRINTED numeric maximum ("4000 or less" -> "6000 or less") but not a threshold that
 * references a Digimon's DP. Recorded on the continuous DeletionMaxDp ledger and consumed by the
 * Delete branch.
 */
export interface DeletionMaxDpModifierAction extends ActionBase {
  kind: "DeletionMaxDpModifier";
  /** Positive lets higher-DP Digimon be deleted. */
  amount: number;
  /** "owner" raises all the owner's DP-based deletions; "self" only this permanent's. */
  scope: "owner" | "self";
  duration: EffectDurationRef;
}
