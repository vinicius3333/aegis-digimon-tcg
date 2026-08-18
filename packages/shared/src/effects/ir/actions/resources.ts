// Memory, deck draw, and cost-modification actions.

import type { ActionBase } from "./base.js";
import type { Action } from "./index.js";
import type { EffectDurationRef } from "../durations.js";
import type { Controller, Filter, Target } from "../filters.js";

export interface DrawAction extends ActionBase {
  kind: "Draw";
  controller: Controller;
  amount: number;
}

export interface GainMemoryAction extends ActionBase {
  kind: "GainMemory";
  amount: number; // negative => lose memory
  /**
   * Deferred one-shot: apply the memory change at the stated boundary instead of
   * immediately ("At the end of your turn, lose 3 memory" — BT1-021). The delayed
   * change still fires if the source permanent leaves the field first (KB Q882/Q883:
   * the effect has already activated).
   */
  at?: "endOfTurn";
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
  /** Permit choosing any amount between `minimum` and `amount`. */
  upTo?: boolean;
  /** Minimum amount that must be trashed when `upTo` permits choosing the amount. */
  minimum?: number;
  /** Target specification (alternative to controller+amount). */
  target?: Target;
  /** Number of cards from the top. */
  topCount?: number;
  /** Store the number actually trashed for a later result condition. */
  trackCount?: string;
}

/** Which cost a CostModifier changes. */
export type CostType =
  | "play" // the card's play cost (from hand/trash) — "Play Cost -N"
  | "digivolve" // a digivolution cost — "Digivolution Cost -N"
  | "use" // a Tamer/Option use cost (the generic "reduce the cost" form)
  | "dpDeletion" // legacy compiler label for owner-wide DP-deletion maximum modifiers
  | "playcost" // alternative name for play cost
  | "playCost"; // alternative name for play cost

export interface CostModifierAction extends ActionBase {
  kind: "CostModifier";
  /** Which cost is changed. */
  costType: CostType;
  /**
   * How `amount` is applied:
   *   - "delta" (default): a signed delta added to the cost (negative => cheaper).
   *     `int ChangeCost(){ Cost = <count()>; }` / `Cost = 0` form ("the cost IS equal
   *     to <count>" / "this card costs 0"). Per KB BT7-040 Q1568 the SET value is the
   *     base cost computed FIRST; other reduction effects then subtract from it, so the
   *     interpreter records it via the cost layer's `setFixed` (absolute) entry, which
   *     is applied before additive deltas. For the count-driven SET cards (BT7-040 /
   *     BT7-100) `scaling` carries the count (security stack) that produces `amount`.
   */
  mode?: "delta" | "set" | "raiseCeiling" | "reduce";
  /** Signed delta (mode "delta") or the absolute cost (mode "set") applied to the cost. */
  amount: number;
  /** Whose / which cards' cost is modified (defaults to the source card for the self form). */
  target: Target;
  /**
   * Optional constraint on the permanent being used as the digivolution base. This is
   * distinct from `target` for hand-resident effects: `target` identifies the card in hand
   * whose cost changes, while `sourceFilter` identifies what may evolve into it (BT3-031).
   */
  sourceFilter?: Filter;
  /** How long the modifier is live. */
  duration: EffectDurationRef;
  /**
   * `amount` then carries the per-unit literal and the multiplier is a runtime count.
   * (The runtime count comes from the inherited `scaling`; for mode "set" the resolved
   * count IS the absolute cost.)
   */
  scaled?: boolean;
  handResident?: boolean;
  /** Restriction kind (for cost modifiers that gate by restriction). */
  restriction?: string;
  /** True when the modifier is consumed by the next successful matching cost payment. */
  once?: boolean;
  /**
   * Actions to run when a `once` cost modifier is actually consumed by a successful cost
   * payment. The consuming permanent is bound under `consumeBindAs` for those actions.
   */
  onConsume?: Action[];
  /** Selection name used by `onConsume` actions to reference the permanent whose cost was modified. */
  consumeBindAs?: string;
  /**
   * Destination card filter for digivolve cost reduction (CAP-C-10). When present, the
   * reduction applies only when digivolving INTO a card matching this filter (the card
   * (BT2-088: source in battleArea + destination is a Tyrannomon-named card in hand).
   */
  into?: Filter;
}

/**
 * "When this card would be played, by [paying an OPTIONAL payment], reduce this card's play
 * cost by [a fixed amount | the sacrificed Digimon's play cost]." The pay-time interactive
 * cost-reduction family (EX9-043 optional-trash → −2; BT25-076 sacrifice → −[deleted cost]).
 *
 * This is fundamentally different from a passive `CostModifier` / `Replacement reduceCost`:
 *   1. It runs at PAY TIME, after cost calculation and before payment — the play action fires
 *      the in-hand card's `BeforePayCost` window, this action resolves SERVER-SIDE (the optional
 *      payment is executed by the engine, never trusted from the client), and the resulting
 *      delta is floored into the cost before memory is spent (T-08-26 / T-08-27).
 *   2. The delta can be DYNAMIC — for `deletedSacrificePlayCost` it equals the printed play cost
 *      of the Digimon the controller chose to delete (BT25-076), not a static/count-scaled value.
 *
 * The payment is OPTIONAL: when declined the delta is 0 and the full cost is
 * paid. The interpreter records the computed delta on `ctx.playCostDelta`; the play action reads
 * it. Authored via a hand-IR override (the runtime record does not emit this kind).
 */
export interface ReducePlayCostAction extends ActionBase {
  kind: "ReducePlayCost";
  /** The OPTIONAL payment that, when made, earns the reduction. */
  payment:
    | {
        /** "By trashing 1 [Cyborg]/[Ver.5] card from your hand" (EX9-043). */
        kind: "trashFromHand";
        /** Which hand cards are eligible to trash (the trait gate). */
        filter: Filter;
      }
    | {
        /** "By deleting 1 of your play-cost-≤11 [Negamon] Digimon" (BT25-076). */
        kind: "sacrificePermanent";
        /** Which of the controller's battle-area Digimon may be sacrificed. */
        target: Target;
      };
  /** How the cost delta is computed from the payment. */
  amount: { kind: "fixed"; value: number } | { kind: "deletedSacrificePlayCost" };
}
