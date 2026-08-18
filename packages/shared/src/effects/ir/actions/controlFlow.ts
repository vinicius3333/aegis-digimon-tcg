// Branching, modality, delay, and event-driven sub-effects.

import type { ActionBase } from "./base.js";
import type { Action } from "./index.js";
import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters.js";
import type { Condition, Scaling } from "../predicates.js";

/**
 * Grant a triggered effect to a chosen permanent for a duration — "gains '[Start of Your Main
 * Phase] This Digimon attacks'" (CAP-C-16, BT21-077). The watcher fires through the SubTrigger
 * bus and is swept at the duration boundary. `sameTarget` on the target reuses the preceding
 * action's permanent(s).
 */
export interface GainTriggeredEffectAction extends ActionBase {
  kind: "GainTriggeredEffect";
  target: Target;
  /** Mapped to a SubTriggerEventName by the interpreter's SUBTRIGGER_EVENT_MAP. */
  gainedTrigger: string;
  gainedActions: Action[];
  duration: EffectDurationRef;
}

export interface DelayedEffectAction extends ActionBase {
  kind: "DelayedEffect";
  trigger: "nextEndOfOpponentTurn";
  effect: Action;
}

/** "Activate N of the effects below". */
export interface ModalAction extends ActionBase {
  kind: "Modal";
  choose: number;
  /** "for every N of <unit>, activate 1 option". Overrides `choose` when present. */
  chooseScaling?: Scaling;
  /** Activate every option instead, when the live condition holds. */
  chooseAll?: { condition: Condition };
  options: Action[][];
  /** Player-facing labels, aligned by index with `options`. */
  labels?: string[];
  /** Per-option availability gate evaluated at decision time. */
  optionConditions?: Array<Condition | null>;
}

/** Execute exactly one ordered action list based on a live condition. */
export interface ConditionalBranchAction extends Omit<ActionBase, "condition"> {
  kind: "ConditionalBranch";
  condition: Condition;
  ifTrue: Action[];
  ifFalse?: Action[];
}

/**
 * A delayed/triggered sub-effect: "When X, <effect>". `when` describes the future event that
 * arms it; `actions` run when it fires. The sub-trigger subsystem subscribes these to the bus.
 */
export type SubTriggerEvent =
  | "whenAttacking"
  | "whenAttackTargetSwitched"
  | "whenOpponentAttacks"
  | "whenBlocked"
  | "whenBlockerActivated" // one of your Digimon suspended to activate ＜Blocker＞
  | "whenSuspended"
  | "whenUnsuspended"
  | "whenDeletesInBattle"
  | "whenOneOfYoursDigivolves"
  | "onDeletionOf"
  | "whenSecurityRemoved"
  | "whenAddSecurity"
  | "onAddDigivolutionCards"
  | "whenPlayed"
  | "whenOptionPlayed" // the option-permanent placement seam
  | "whenLeavesPlay" // a non-replacement reaction
  | "whenLinked"
  | "whenLinkTrashed" // a genuine trash, NOT a link-card replace (KB EX10-062 Q5172 / EX10-073 Q5188)
  | "whenDigivolutionTrashed" // a genuine effect-trash, NOT a return-to-hand bounce-clear (KB P-004 Q4113)
  | "whenOptionUsed" // BT19-040 token watcher
  | "onDigivolutionCardDiscarded" // per-card event (BT10-006, BT14-083)
  | "onDigivolutionCardsDiscardedBatch" // simultaneous exact-source reactions, before discarded watchers are recomputed away
  | "onDigiBurstCardDiscarded" // the batch restricted to cards paid for a Digi-Burst cost
  | "onDigivolutionCardReturnToDeckBottom" // BT11-065
  | "onDiscardLibrary" // library mill (BT14-077)
  | "startOfYourMainPhase" // fired at the watched permanent's owner's main-phase start
  | "endOfTurn" // fired at the owner's turn end, e.g. EX10-035's delayed self-delete
  | "whenTrashedFromDigivolutionCards"
  | "whenEffectSuspends"
  | "whenEffectTrashes"
  | "whenOpponentDraws"
  | "whenCardAddedToSecurity"
  | "opponentAddsSecurityToHand"
  | "whenCardPlacedInDigivolution"
  | "whenMovedFromBreeding"
  | "whenBattleWon"
  | "whenHandCardTrashed"
  | "whenHandTrashed" // once per trash ACTION, not per card (KB Q6400/Q6401)
  | "whenTrashedFromSecurity"
  | "whenTrashedFromHand"
  | "whenEffectAddsToHand"
  | "whenEffectAddsToOpponentHand" // any effect-driven hand addition, unlike the draw-only whenOpponentDraws
  | "whenDigimonWouldLeave" // the ＜Delay＞ watcher (BT19-099); aliases whenLeavesPlay at runtime
  | "wouldBeReturned" // BT20-074; CAP-C-11
  | "whenTrashedByEffect" // while in the battle area (BT19-093; CAP-E8)
  | "whenTrashedFromDeck" // BT19-097; CAP-H-01
  | "whenCheckedFaceUpSecurity" // BT20-055; CAP-H-03
  | "raw";

export interface SubTriggerAction extends ActionBase {
  kind: "SubTrigger";
  event: SubTriggerEvent;
  /**
   * Keep the watcher at activating-player scope instead of anchoring it to the source permanent,
   * so it still affects permanents entering later after the source leaves play (BT10-016 Q1945).
   * Requires `duration` to give the retained context an expiry.
   */
  playerScoped?: boolean;
  /** Defaults to the source. */
  on?: Target;
  /**
   * For onDeletionOf / onAddDigivolutionCards: which cards' event arms the trigger ("your Tokens
   * or Digimon with the [Puppet] trait is deleted"). Only a matching card fires the sub-effect.
   */
  sourceFilter?: Filter;
  /** Restrict the card whose effect produced the event ("by [Rasenmon]'s effect"). */
  effectSourceFilter?: Filter;
  /** Do not fire when this card's own effect caused the deck trash (EX2-039). */
  excludeSelfEffect?: boolean;
  /**
   * Fire-TIME gate on the event payload (TriggerInfo) rather than a battle-area subject, for
   * events gated on the event data itself. whenAddSecurity uses it for "your security" plus the
   * [Zaxon]/[Royal Base] check on the just-added cards (BT23-083). The whole body is skipped when
   * it fails, so the body's mandatory tail never runs on an off-gate event.
   */
  fireCondition?: Condition;
  /**
   * Controller scope of the EFFECT that drove the event, for events carrying an acting-effect
   * seat (currently whenEffectSuspends). Absent lets ANY effect's suspension fire it.
   */
  bySourceController?: "mine" | "opponent";
  actions: Action[];
  /**
   * Lifecycle of a GRANTED watcher installed on a chosen permanent: `untilOpponentTurnEnd`
   * clears it at the watched permanent's owner's turn end. Absent persists until the anchor
   * leaves the field.
   */
  duration?: EffectDurationRef;
  /** Original prose, for diagnostics and unsupported routing. */
  raw: string;
  /** Internal text before recursive compilation. */
  _innerText?: string;
  triggerFilter?: Filter;
  /**
   * When several permanents satisfy the event at once, the controller picks ONE to drive the
   * body — for BT19-099 ＜Delay＞ the chosen leaving Digimon is the cost reference for
   * `relativeToLeavingDigimon`. The runtime already fires per-leaving-permanent, so this
   * single-subject default matches the field.
   */
  pickOne?: boolean;
  /**
   * Fire at most once per trigger-timing window even when several matching events land together
   * (KB Q2814, BT2-053: "triggers only once even when multiple same-named Digimon are played").
   * Implemented by skipping later fires sharing an `effectKey + timingId`.
   */
  oncePerTiming?: boolean;
  /** Stable key synthesized for a containing `[Once Per Turn]` continuous watcher. */
  oncePerTurnKey?: string;
  /**
   * One-shot: unsubscribe the first time the watcher actually fires, rather than persisting until
   * its anchor leaves. The "at the NEXT end of your opponent's turn" shape — EX3-069, whose KB
   * Q5722 confirms a Digimon surviving that first deletion is not deleted at later turn ends.
   */
  once?: boolean;
}

/** What a replacement effect does instead of, or before, the replaced event. */
export type ReplacementEvent =
  | "wouldLeavePlay"
  | "wouldBeDeleted"
  | "wouldBePlayed"
  | "wouldDigivolve"
  | "wouldLeaveBattleArea"
  | "raw";

export interface ReplacementAction extends ActionBase {
  kind: "Replacement";
  event: ReplacementEvent;
  on?: Target;
  /**
   * `"prevent"` means the event does not happen, at the price of a cost. Optional: the prose
   * compiler sometimes emits the mode as a nested `{kind:"Prevent"}` or nested reduceCost
   * `Replacement` inside `actions` (BT18-082, BT22-079, BT23-073), and `runReplacement` derives
   * the effective mode from those shapes when this is absent.
   */
  mode?: "reduceCost" | "increaseCost" | "prevent" | "instead";
  amount?: number;
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
  leaveCause?: "byOpponentEffect" | "otherThanYourEffect" | "byEffect" | "byBattle" | "otherThanBattle" | "any";
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
  raw: string;
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
