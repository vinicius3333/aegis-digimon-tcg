// Effects that replace or prevent an event before it happens.

import type { Filter, Target } from "../filters/filter.js";
import type { EffectDurationRef } from "../durations.js";
import type { Condition } from "../predicates/conditions.js";
import type { Scaling } from "../predicates/scaling.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";

/**
 * Grant a triggered effect to a chosen permanent for a duration — "gains '[Start of Your Main
 * Phase] This Digimon attacks'" (CAP-C-16, BT21-077). The watcher fires through the SubTrigger
 * bus and is swept at the duration boundary. `sameTarget` on the target reuses the preceding
 * action's permanent(s).
 */

/** What a replacement effect does instead of, or before, the replaced event. */
export type ReplacementEvent =
  | "wouldLeavePlay"
  | "wouldBeDeleted"
  | "wouldBePlayed"
  | "wouldTrashDigivolutionCard"
  | "wouldDigivolve"
  | "wouldLeaveBattleArea"
  | "raw";

export interface ReplacementAction extends ActionBase {
  kind: "Replacement";
  event: ReplacementEvent;
  /** Turn window for a triggered replacement installed by an activated effect. */
  duration?: EffectDurationRef;
  on?: Target;
  /**
   * `"prevent"` means the event does not happen, at the price of a cost. Optional: the prose
   * compiler sometimes emits the mode as a nested `{kind:"Prevent"}` or nested reduceCost
   * `Replacement` inside `actions` (BT18-082, BT22-079, BT23-073), and `runReplacement` derives
   * the effective mode from those shapes when this is absent.
   */
  mode?: "reduceCost" | "increaseCost" | "prevent" | "instead" | "gainMemoryOnDna";
  /** Pay a prevention cost by digivolving the leaving permanent into this source from Trash. */
  digivolveFromTrash?: boolean;
  amount?: number;
  /** Remove a successful digivolution-cost reduction after the payment is calculated. */
  consumeOnActivate?: boolean;
  /** Use the number of cards/resources actually paid as this replacement's cost reduction. */
  amountFromPaidCost?: boolean;
  /**
   * Mutually exclusive reduceCost amounts the controller chooses between, never summed — for
   * text offering a base reduction plus a conditional larger one "instead" (EX6-006; KB Q3700
   * confirms the controller may still pick the smaller amount). Each entry's `condition` gates
   * whether it is offered; a single eligible entry installs without a prompt, none installs
   * nothing. Overrides a flat `amount`.
   */
  amountChoices?: { amount: number; condition?: Condition; raw?: string }[];
  /** Which cards this replacement applies to ("when a Digimon would be played"). */
  sourceFilter?: Filter;
  /** For a wouldDigivolve cost reduction: the digivolution-RESULT filter it applies to. */
  into?: Filter;
  /** What to do instead, or the replacement payload. */
  actions?: Action[];
  /** For a "prevent": which permanents are protected. Absent means self. */
  target?: Target;
  /** "they don't leave" rather than "1 of those doesn't leave". */
  affectsAll?: boolean;
  /**
   * For "prevent": which removal causes the reaction watches. `ActionBase.cost` is the gate the
   * controller pays to prevent.
   */
  leaveCause?:
    | "opponentEffect"
    | "byOpponentEffect"
    | "otherThanYourEffect"
    | "byEffect"
    | "byBattle"
    | "otherThanBattle"
    | "any";
  /**
   * For "prevent": the protection is "can't LEAVE other than by deletion" (EX6-044). A
   * move/bounce/return is prevented but a DELETION is not (KB EX6-044 Q3771). Absent covers any
   * matching leave, per `event`.
   */
  exceptDeletion?: boolean;
  /**
   * ＜Digisorption＞ redirect (BT3-056): with mode "reduceCost", the suspend cost is paid from the
   * OPPONENT's Digimon instead of the controller's.
   */
  digisorptionRedirect?: boolean;
  /**
   * Side effects activating alongside this Replacement when its cost is paid, each modifying the
   * play environment for the current play event. Currently only
   * `AllowDigiXrosMaterialsFromTrash` (BT21-030).
   */
  additionalEffects?: Action[];
  /**
   * Dynamic ＜Delay＞ gate: usable only once the source has an armed Delay grant. Using it
   * consumes the grant and trashes the source before the payload runs.
   */
  requiresDelayArmed?: true;
  /**
   * Play a matching card from this Digimon's digivolution cards or its owner's trash, then
   * relocate this Digimon beneath the played permanent. The relocation is part of the active
   * leave replacement, so it must not open a second leave-prevention window.
   */
  playAndRelocateSourceUnder?: {
    filter: Filter;
    from: ("trash" | "digivolutionCards")[];
  };
  /**
   * Scaling applied to a `reduceCost`/`increaseCost` amount, when the compiler emits it under
   * this name rather than the generic `scaling`. `scaling` wins when both are present.
   */
  reduceCostScaling?: Scaling;
  /** Stable key synthesized for a containing `[Once Per Turn]` continuous watcher. */
  oncePerTurnKey?: string;
  /** Original prose, for diagnostics and unsupported routing. Absent on hand-authored IR. */
  raw?: string;
}

/**
 * Legacy nested prevention payload emitted inside `Replacement.actions`, plus a few direct
 * prevention actions. Nested `Prevent` is normalized by `runReplacement`; a direct one is read as
 * a conservative `wouldLeavePlay` prevention for the source.
 */
export interface PreventAction extends ActionBase {
  kind: "Prevent";
  mode?: "leavePlay" | "delete" | "battle" | string;
  target?: Target;
  affectsAll?: boolean;
  leaveCause?: ReplacementAction["leaveCause"];
}
