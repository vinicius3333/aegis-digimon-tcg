// Memory, deck draw, and cost-modification actions.

import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters/filter.js";
import type { Controller } from "../filters/zones.js";
import type { Condition } from "../predicates/conditions.js";
import type { Cost } from "../predicates/costs.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";

export interface DrawAction extends ActionBase {
  kind: "Draw";
  controller: Controller | "both";
  amount: number;
  /** Draw only enough cards to reach this hand size. */
  untilHandSize?: number;
}

export interface GainMemoryAction extends ActionBase {
  kind: "GainMemory";
  /** Negative means lose memory. */
  amount: number;
  /**
   * Deferred one-shot: apply at the stated boundary rather than immediately ("At the end of your
   * turn, lose 3 memory" — BT1-021). It still fires if the source leaves the field first, since
   * the effect has already activated (KB Q882/Q883).
   */
  at?: "endOfTurn";
}

/** Pay any amount from zero through maxMemory, applying amount DP per memory paid. */
export interface PayMemoryUpToAction extends ActionBase {
  kind: "PayMemoryUpTo";
  maxMemory: number;
  target: Target;
  amount: number;
  duration: EffectDurationRef;
}

export interface SetMemoryAction extends ActionBase {
  kind: "SetMemory";
  value: number;
}

/** Raise the opponent-side memory required to end the active turn (BT14-081). */
export interface SetTurnEndMemoryAction extends ActionBase {
  kind: "SetTurnEndMemory";
  minimum: number;
}

/** "Trash the top N cards of your deck" (self-mill). */
export interface TrashTopDeckAction extends ActionBase {
  kind: "TrashTopDeck";
  controller: Controller | "both";
  amount: number;
  /** Allow any amount between `minimum` and `amount`. */
  upTo?: boolean;
  minimum?: number;
  /** Alternative to controller + amount. */
  target?: Target;
  topCount?: number;
  /** Store how many were actually trashed, for a later result condition. */
  trackCount?: string;
}

/** Which cost a CostModifier changes. */
export type CostType =
  | "play" // "Play Cost -N", from hand or trash
  | "digivolve"
  | "use" // a Tamer/Option use cost — the generic "reduce the cost" form
  | "dpDeletion" // legacy compiler label for owner-wide DP-deletion maximum modifiers
  | "level" // raises the level ceiling a play effect may reach (BT13-035 / BT13-064)
  | "playcost" // alternative spelling of "play"
  | "playCost"; // alternative spelling of "play"

export interface CostModifierAction extends ActionBase {
  kind: "CostModifier";
  costType: CostType;
  /**
   * `"delta"` (the default) adds a signed amount. `"set"` is the "the cost IS equal to <count>" /
   * "this card costs 0" form: per KB BT7-040 Q1568 the SET value is the base cost computed FIRST,
   * with other reductions subtracting from it, so it is recorded as the cost layer's `setFixed`
   * entry and applied before additive deltas. For the count-driven SET cards (BT7-040, BT7-100)
   * `scaling` carries the security-stack count that produces `amount`.
   */
  mode?: "delta" | "set" | "raiseCeiling" | "reduce";
  amount: number;
  /** Defaults to the source card for the self form. */
  target: Target;
  /** Modify the selected battle-area permanent's current play cost, not matching cards in loose zones. */
  existingPermanent?: boolean;
  /**
   * For hand-resident effects: `target` is the card in hand whose cost changes, while this is the
   * permanent that may evolve into it (BT3-031).
   */
  sourceFilter?: Filter;
  duration: EffectDurationRef;
  /**
   * `amount` is a per-unit literal multiplied by a runtime count from the inherited `scaling`.
   * For mode "set" the resolved count IS the absolute cost.
   */
  scaled?: boolean;
  handResident?: boolean;
  /** For cost modifiers that gate by restriction. */
  restriction?: string;
  /** Consumed by the next successful matching cost payment. */
  once?: boolean;
  /**
   * Runs when a `once` modifier is actually consumed. The consuming permanent is bound under
   * `consumeBindAs` for these actions.
   */
  onConsume?: Action[];
  /** The name `onConsume` uses to reference the permanent whose cost was modified. */
  consumeBindAs?: string;
  /**
   * Destination filter for a digivolve cost reduction (CAP-C-10): the reduction applies only when
   * digivolving INTO a matching card. BT2-088 pairs a battle-area source with a Tyrannomon-named
   * destination in hand.
   */
  into?: Filter;
}

/**
 * "When this card would be played, by [an OPTIONAL payment], reduce this card's play cost by
 * [a fixed amount | the sacrificed Digimon's play cost]" — EX9-043 (optional trash → −2) and
 * BT25-076 (sacrifice → −[deleted cost]).
 *
 * Unlike a passive `CostModifier` or `Replacement reduceCost`, this runs at PAY TIME: the play
 * action fires the in-hand card's `BeforePayCost` window, this resolves SERVER-SIDE — the optional
 * payment is executed by the engine, never trusted from the client — and the delta is floored into
 * the cost before memory is spent (T-08-26 / T-08-27). The delta can also be DYNAMIC: for
 * `deletedSacrificePlayCost` it equals the printed play cost of the Digimon the controller chose
 * to delete, not a static or count-scaled value.
 *
 * Declining the payment leaves a delta of 0 and the full cost. The computed delta is recorded on
 * `ctx.playCostDelta` for the play action to read. Authored via a hand-IR override; the runtime
 * record does not emit this kind.
 */
export interface ReducePlayCostAction extends ActionBase {
  kind: "ReducePlayCost";
  payment:
    | {
        /** "By trashing 1 [Cyborg]/[Ver.5] card from your hand" (EX9-043). */
        kind: "trashFromHand";
        filter: Filter;
      }
    | {
        /** Pay an ordinary IR cost to earn the fixed reduction (BT26-098). */
        kind: "payCost";
        cost: Cost;
      }
    | {
        /** "By deleting 1 of your play-cost-≤11 [Negamon] Digimon" (BT25-076). */
        kind: "sacrificePermanent";
        target: Target;
      }
    | {
        /** "By trashing 7 or more digivolution cards from the bottom of a Mother D-Reaper" (EX2-055). */
        kind: "trashDigivolution";
        target: Target;
        minimum: number;
      }
    | {
        /**
         * No payment at all — a board state gates the reduction instead (BT16-065: "while a [Boss]
         * Digimon is in play"). The condition is re-evaluated at pay time.
         */
        kind: "automatic";
        condition: Condition;
      }
    | {
        /** "By returning 6 [D-Brigade] cards from your trash to the bottom of your deck" (BT16-065). */
        kind: "returnFromTrashToDeckTop";
        target: Target;
      }
    | {
        /**
         * "By trashing the top card of your security stack, down to `leaveCount` cards" (BT16-100).
         * Repeatable: each trashed card pays one unit, so the amount is `perPaid`.
         */
        kind: "trashSecurityTopUpToLeave";
        leaveCount: number;
      };
  amount:
    | { kind: "fixed"; value: number }
    | { kind: "deletedSacrificePlayCost" }
    /** `value` per unit actually paid, for the repeatable payments. */
    | { kind: "perPaid"; value: number };
}

/** Run a group of actions only once one shared activation cost is paid. */
export interface CostGatedBlockAction extends ActionBase {
  kind: "CostGatedBlock";
  cost: Cost;
  actions: Action[];
}
