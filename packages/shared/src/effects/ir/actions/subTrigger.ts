// Watchers that arm now and fire on a later game event.

import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters/filter.js";
import type { Condition } from "../predicates/conditions.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";

/**
 * Grant a triggered effect to a chosen permanent for a duration — "gains '[Start of Your Main
 * Phase] This Digimon attacks'" (CAP-C-16, BT21-077). The watcher fires through the SubTrigger
 * bus and is swept at the duration boundary. `sameTarget` on the target reuses the preceding
 * action's permanent(s).
 */

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
  | "whenAnyDigivolves" // `sourceFilter` narrows the controller
  | "whenHatch"
  | "onDeletionOf"
  | "whenSecurityRemoved"
  | "whenEffectRemovesFromSecurity"
  | "whenCardTrashedFromSecurity"
  | "whenEffectTrashesFromSecurity"
  | "whenAddSecurity"
  | "onAddDigivolutionCards"
  | "whenPlayed"
  | "whenOptionPlayed" // the option-permanent placement seam
  | "whenOptionInBattleAreaTrashed" // an Option permanent leaves the battle area for trash
  | "whenLeavesPlay" // a non-replacement reaction
  | "whenLinked"
  | "whenLinkTrashed" // a genuine trash, NOT a link-card replace (KB EX10-062 Q5172 / EX10-073 Q5188)
  | "whenDigimonTopTrashed" // a Digimon top is trashed while its source is promoted
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
  | "whenOpponentMovedFromBreeding"
  | "whenBattleWon"
  | "whenSecurityBattleEnded" // delayed Security bodies resolve after the checked card reaches trash
  | "whenHandCardTrashed"
  | "whenHandTrashed" // once per trash ACTION, not per card (KB Q6400/Q6401)
  | "whenTrashedFromSecurity"
  | "whenTrashedFromHand"
  | "whenEffectAddsToHand"
  | "whenDigimonReturnsToHand"
  | "whenEffectAddsToOpponentHand" // any effect-driven hand addition, unlike the draw-only whenOpponentDraws
  | "whenCardReturnsFromTrashToHand"
  | "whenDigimonWouldLeave" // the ＜Delay＞ watcher (BT19-099); aliases whenLeavesPlay at runtime
  | "wouldBeReturned" // BT20-074; CAP-C-11
  | "whenTrashedByEffect" // while in the battle area (BT19-093; CAP-E8)
  | "whenTrashedFromDeck" // BT19-097; CAP-H-01
  | "whenCheckedFaceUpSecurity" // BT20-055; CAP-H-03
  | "raw"
  | "whenFaceUpCardsAddedToOpponentSecurity";

export interface SubTriggerAction extends ActionBase {
  kind: "SubTrigger";
  event: SubTriggerEvent;
  /** Restrict a leave-play watcher by the cause of the departure. */
  leaveCause?:
    | "opponentEffect"
    | "byOpponentEffect"
    | "otherThanYourEffect"
    | "byEffect"
    | "byBattle"
    | "otherThanBattle"
    | "any";
  /** For whenHandTrashed, select whose hand must have been trashed. Defaults to mine. */
  handTrashedController?: "mine" | "opponent";
  /**
   * The printed turn window of the clause that installed this watcher: a `[Your Turn]` watcher
   * fires only while its owner is the turn player, an `[Opponent's Turn]` one only on the other
   * turn. Stamped from the effect's trigger at registration; `[All Turns]` leaves it absent.
   */
  turnScope?: "yourTurn" | "opponentsTurn";
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
  /** For digivolution watchers: filter the Digimon being digivolved into (not the source Digimon). */
  digivolveIntoFilter?: Filter;
  /** Restrict the permanent hosting this watcher to a live board filter. */
  hostFilter?: Filter;
  /** Do not fire if the watcher host is in the same simultaneous deletion batch. */
  notSimultaneous?: boolean;
  /**
   * For onAddDigivolutionCards, filters the cards just placed under the subject. At least one
   * added card must match for the watcher to fire.
   */
  addedDigivolutionCardFilter?: Filter;
  /** Require the newly added digivolution cards to have been placed at this stack position. */
  addedDigivolutionCardsPosition?: "top" | "bottom";
  /** Require the event to be the source Digimon's former top card moving to its stack bottom. */
  requirePlacedOwnTopAtStackBottom?: boolean;
  /** For whenLinked, at least one card newly linked by this event must match. */
  linkedCardFilter?: Filter;
  /** Restrict the card whose effect produced the event ("by [Rasenmon]'s effect"). */
  effectSourceFilter?: Filter;
  /** Restrict an effect-driven event to a producer whose printed text carries this keyword. */
  bySourceKeyword?: string;
  /** Require the triggering event to carry effect attribution. */
  requireByEffect?: boolean;
  /** Do not fire when this card's own effect caused the deck trash (EX2-039). */
  excludeSelfEffect?: boolean;
  /**
   * Fire-TIME gate on the event payload (TriggerInfo) rather than a battle-area subject, for
   * events gated on the event data itself. whenAddSecurity uses it for "your security" plus the
   * [Zaxon]/[Royal Base] check on the just-added cards (BT23-083). The whole body is skipped when
   * it fails, so the body's mandatory tail never runs on an off-gate event.
   */
  fireCondition?: Condition;
  /** For whenDigivolutionTrashed, require that the trashed card was the stack's top card. */
  requireTrashedDigivolutionCardWasTop?: boolean;
  /** For a discard batch, require at least one card that was face down before it was trashed. */
  requireFaceDownDigivolutionCardTrashed?: boolean;
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
  /** Original prose, for diagnostics and unsupported routing. Absent on hand-authored IR. */
  raw?: string;
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
