// Deleting, trashing, and returning cards.

import type { ActionBase } from "./base.js";
import type { EffectDurationRef } from "../durations.js";
import type { Controller, Filter, Target, ZoneRef } from "../filters.js";
import type { Scaling } from "../predicates.js";

export interface DeleteAction extends ActionBase {
  kind: "Delete";
  target: Target;
  /** Controller whose permanents are deleted (for controller-less target shorthand). */
  controller?: Controller;
  /** Schedule the resolved target's deletion for the owner's end-of-turn window. */
  at?: "endOfTurn";
  /** Add to the target DP ceiling for each unit counted by this scaling clause. */
  dpCeilingScaling?: Scaling & { amount: number };
  /** Dynamically raises a printed play-cost ceiling on the delete target. */
  playCostCeiling?: {
    base: number;
    raise: number;
    per: number;
    filter: Filter;
    unit: "cards" | "digivolutionCards";
    raw?: string;
  };
}

/**
 * Delete matching permanents until the remaining count equals a live resource count.
 * BT19-094: "Delete your opponent's Digimon until they have as many as the number
 * of your security cards." The target describes the candidate pool to reduce.
 */
export interface DeleteUntilCountAction extends ActionBase {
  kind: "DeleteUntilCount";
  target: Target;
  untilCountSource: "mineSecurityCount";
  /** Store the number of permanents actually deleted under this key. */
  trackCount?: string;
}

/**
 * Delete opponent permanents up to a TOTAL play-cost budget (P-094 Destromon).
 * The player selects permanents sequentially until the budget is exhausted, then
 * all selected permanents are deleted in one batch (one OnDestroyedAnyone window).
 * The budget value is computed by the card from its digivolution stack count;
 * the engine only enforces the budget cap (server-side accumulation).
 */
export interface DeleteBudgetAction extends ActionBase {
  kind: "DeleteBudget";
  /** Filter for eligible targets (opponent Digimon/Tamer). */
  filter: Filter;
  /** Maximum total printed play-cost cap for selected permanents. */
  budget: number;
  /** Whether the budget is "up to" (optional decline per pick) vs mandatory. */
  upTo?: boolean;
  /**
   * Optional scaling: adds `scaling.budgetAdd` to the effective budget per `scaling.per`
   * units counted by `scaling.filter` and `scaling.unit`. For BT19-096: unit "security"
   * with filter.faceUp adds 2 per face-up security card the controller has.
   */
  scaling?: Scaling;
}

/**
 * Reveal cards, choose one revealed card as a play-cost reference, then delete opponent
 * permanents up to that chosen card's printed play-cost budget before returning the
 * revealed cards to deck. Used by effects like BT14-067 Ebemon where the reference card
 * is not moved to hand/play/trash; it only supplies the dynamic budget.
 */
export interface RevealChooseDeleteBudgetAction extends ActionBase {
  kind: "RevealChooseDeleteBudget";
  /** How many cards to reveal from the top of the chosen player's deck. */
  revealCount: number;
  /** Whose deck is revealed relative to the effect controller. */
  revealController: "mine" | "opponent";
  /** Eligible revealed cards that may be chosen as the budget reference. */
  chooseFilter: Filter;
  /** Eligible battle-area permanents to delete under the computed play-cost budget. */
  deleteFilter: Filter;
  /** Whether the deletion is "up to" the budget. */
  upTo?: boolean;
  /**
   * Limit the number of deleted permanents after the revealed card establishes the play-cost cap.
   * Absent preserves the original total-budget behavior (BT14-067). `1` encodes "delete 1 whose
   * play cost is <= the chosen card's play cost" (BT9-105).
   */
  deleteCount?: number;
  /** Where all revealed cards are returned after the deletion step. */
  returnRevealed: "deckBottom" | "deckTop" | "deckTopOrBottom" | "trash";
  /** Whether the effect controller chooses the returned cards' order. */
  returnOrder?: "controllerChoice";
}

/**
 * Budget deletion by LEVEL ("delete any number of opponent Digimon whose levels add up to N or
 * less", BT17-051). Like `DeleteBudget` but the per-target cost is the candidate's printed LEVEL,
 * not its play cost. The effective budget = `baseBudget` plus an optional `scaling`-driven add
 * (`scaling.budgetAdd` per `scaling.per` units). `filter` should carry `hasLevel:true` to exclude
 * Lv.- Digimon (KB Q2807).
 */
export interface DeleteLevelBudgetAction extends ActionBase {
  kind: "DeleteLevelBudget";
  filter: Filter;
  baseBudget: number;
  upTo?: boolean;
}

/**
 * Budget deletion by DP ("delete any number of opponent Digimon whose DP totals 3000 or less",
 * BT19-011). The controller selects any combination of opponent Digimon whose DP values sum to
 * at most `baseBudget` (plus any active `AddToDPDeleteBudget` bonus on the source). All selected
 * permanents are deleted in a single batch. The ids of actually-deleted permanents are stored on
 * `ctx.lastDeletedByThisEffectIds` so a subsequent `GainMemory` with `scaling.filter.deletedByThisEffect`
 * can count them (CAP-A3).
 */
export interface DeleteByDPBudgetAction extends ActionBase {
  kind: "DeleteByDPBudget";
  target: Target;
  baseBudget: number;
  /**
   * Scales the budget up at resolution time: adds `per` DP for every card matching `filter`
   * (BT19-011 "increases by 2000 for each of your opponent's Digimon"). Note `per` is an
   * amount-per-card, NOT the divisor that `Scaling.per` represents. Omitted => no scaling.
   */
  budgetBonus?: {
    per: number;
    filter?: Filter;
    unit?: "cards" | "selfDigivolutionCards";
    /** For "for every N cards" style budget bonuses. Default 1. */
    perCount?: number;
  };
}

/**
 * Inherited continuous modifier (BT19-011): adds `amount` DP to the deletion budget of any
 * `DeleteByDPBudget` action executed by the Digimon that inherited this effect.
 * Stacks — multiple copies each contribute their `amount`. Stored via `ctx.fx.addDpDeleteBudget`
 * and read back by `ctx.fx.dpDeleteBudgetBonus` before the budget is computed.
 */
export interface AddToDPDeleteBudgetAction extends ActionBase {
  kind: "AddToDPDeleteBudget";
  amount: number;
}

export interface TrashAction extends ActionBase {
  kind: "Trash";
  target: Target;
  /** Controller whose cards are trashed (for controller-less target shorthand). */
  controller?: Controller;
  /**
   * When set, the interpreter stores the number of cards ACTUALLY trashed under
   * this name in `EffectContext.namedCounts` so a subsequent `dpCeilingModifier`
   * (or `RepeatPerCount`) can scale by the actual trash count. (CAP-E12/E13, BT20-077)
   */
  trackCount?: string;
  /** Bind the instance ids actually trashed for a later condition/action in this resolution. */
  bindResultAs?: string;
  /**
   * Before trashing the targeted permanent(s), return their digivolution-stack cards to the
   * bottom of the deck first (BT20-080-style "trash it; return its digivolution cards to the
   * bottom of the deck" onDeletion bodies) instead of letting them fall to the trash with the
   * top card as ordinary deletion does.
   */
  returnDigivolutionCardsFirst?: boolean;
  /**
   * Who PICKS which hand card(s) are trashed, for a `target.filter.zone === "hand"` discard.
   * `"controller"` (the DEFAULT, and the only behavior existing cards rely on) means the
   * effect's controller picks — matching "trash 1 of your opponent's cards in their hand"
   * (the controller reaches into the opponent's hand). `"opponent"` means the OWNER of the
   * hand picks their own card — "your opponent trashes 1 card in their hand" (BT13-079/
   * BT19-075/BT4-088/EX6-046/EX6-049/etc, KB-confirmed "your opponent chooses"). Distinct
   * from `target.filter.controller`, which only scopes WHICH seat's hand the candidates come
   * from; before this field existed both phrasings compiled to the identical target shape and
   * the interpreter always prompted the controller, silently upgrading the opponent's own
   * discard into the controller reaching into the opponent's hand.
   */
  chooser?: "controller" | "opponent";
}

export interface ReturnAction extends ActionBase {
  kind: "Return";
  target: Target;
  to: "hand" | "deckTop" | "deckBottom";
  /** Let the controller arrange multiple returned cards for the destination. */
  order?: "any";
  /** Loose source zones when cards may be returned from more than one zone. */
  from?: ZoneRef[];
  /**
   * For "return all digivolution cards of that Digimon to the bottom of the deck, then return
   * that Digimon" effects. The stack move uses the same selected permanent as `target`.
   */
  returnDigivolutionCardsFirst?: boolean;
  /** Store returned instance ids under this name for downstream `bindingContains`/`bindingExists`. */
  bindResultAs?: string;
  /**
   * Store the number of cards ACTUALLY returned under this name in
   * `EffectContext.namedCounts`, so a subsequent scaling clause can read it via
   * `unit: "namedCount"` ("gain 1 memory for each card returned", BT9-111 — distinct
   * from re-counting a live filter, which can overcount unrelated cards).
   */
  trackCount?: string;
}

/**
 * Install a delayed self-delete on the permanent THIS effect just played (EX10-035 "[Hand][Main]
 * Binds the just-played permanent's id (the 08-01 played-id result binding) and, via the Phase-7
 * timed-trigger surface, deletes it at the owner's turn end (the `endOfTurn` SubTrigger fired
 * co-located with OnEndTurn), then expires.
 */
export interface DelayedDeletePlayedAction extends ActionBase {
  kind: "DelayedDeletePlayed";
}

export interface DelayedDeleteAction extends ActionBase {
  kind: "DelayedDelete";
  target?: Target;
}

/**
 * "Add N to the maximum DP you can choose with DP-based deletion effects" — a continuous
 * `rule implementation` (read via `Player.MaxDP_DeleteEffect`). Per KB Q2721/Q2722
 * it raises a PRINTED numeric maximum (e.g. "4000 or less" -> "6000 or less") but NOT a
 * threshold that references a Digimon's DP. `scope` distinguishes the owner-wide form
 * (`EffectSourceCard.Owner == card.Owner`, raises any of the owner's DP-based deletions) from
 * the self form (`...PermanentOfThisCard() == card.PermanentOfThisCard()`, only this source
 * permanent's own deletions, i.e. "this Digimon's DP deletion effects' maximums"). Recorded
 * on the continuous DeletionMaxDp ledger and consumed by the Delete interpreter branch.
 */
export interface DeletionMaxDpModifierAction extends ActionBase {
  kind: "DeletionMaxDpModifier";
  /** Signed delta added to the deletion DP cap (positive => can delete higher-DP Digimon). */
  amount: number;
  /** "owner" => all the owner's DP-based deletions; "self" => only this source permanent's. */
  scope: "owner" | "self";
  duration: EffectDurationRef;
}
