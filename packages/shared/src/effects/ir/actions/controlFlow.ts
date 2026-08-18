// Branching, modality, delay, and event-driven sub-effects.

import type { ActionBase } from "./base.js";
import type { Action } from "./index.js";
import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target } from "../filters.js";
import type { Condition, Scaling } from "../predicates.js";

/**
 * Grant a triggered effect to a chosen permanent for a duration (CAP-C-16, BT21-077).
 * The targeted permanent receives a new timed trigger — "gains '[Start of Your Main Phase]
 * This Digimon attacks'" — that fires through the SubTrigger bus when the matching timing
 * event occurs. Duration-scoped: the watcher is swept when the duration boundary passes
 * (e.g. `untilOpponentTurnEnd` → end of the opponent's next turn). `sameTarget: true` on
 * the target reuses the permanent(s) chosen by the immediately preceding action.
 */
export interface GainTriggeredEffectAction extends ActionBase {
  kind: "GainTriggeredEffect";
  /** The permanent(s) that receive the new triggered effect. */
  target: Target;
  /**
   * The trigger event name the granted effect watches (mapped to a SubTriggerEventName by the
   * interpreter's SUBTRIGGER_EVENT_MAP). "StartOfYourMainPhase" fires at the target's owner's
   * main-phase start.
   */
  gainedTrigger: string;
  /** The actions to run each time the granted trigger fires. */
  gainedActions: Action[];
  /** How long the granted triggered effect lasts before it is swept. */
  duration: EffectDurationRef;
}

export interface DelayedEffectAction extends ActionBase {
  kind: "DelayedEffect";
  trigger: "nextEndOfOpponentTurn";
  effect: Action;
}

/** "Activate N of the effects below" — choose among the nested modal options. */
export interface ModalAction extends ActionBase {
  kind: "Modal";
  /** How many of the options to activate (fixed count). */
  choose: number;
  /**
   * Scales `choose` dynamically: "for every N of <unit>, activate 1 option".
   * `choose` is overridden by `floor(scaleFactor(chooseScaling))` at runtime.
   * Both may be set; `chooseScaling` wins when present.
   */
  chooseScaling?: Scaling;
  /** Activate every option instead when the live condition is met. */
  chooseAll?: { condition: Condition };
  /** Each option is an ordered action list. */
  options: Action[][];
  /** Player-facing labels aligned by index with `options`. */
  labels?: string[];
  /** Optional live availability gate for each option at decision time. */
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
 * A delayed / triggered sub-effect: "When X, <effect>". The `when` describes the
 * future event that arms the sub-effect; `actions` run when it fires. The engine's
 * sub-trigger subsystem subscribes these to the event bus.
 */
export type SubTriggerEvent =
  | "whenAttacking" // "When this Digimon attacks"
  | "whenAttackTargetSwitched" // "When attack targets change"
  | "whenOpponentAttacks" // "When one of your opponent's Digimon attacks"
  | "whenBlocked" // "When this Digimon is blocked"
  | "whenBlockerActivated" // one of your Digimon suspended to activate ＜Blocker＞
  | "whenSuspended" // "When this Digimon/Tamer suspends"
  | "whenUnsuspended" // "When this Digimon/Tamer becomes unsuspended"
  | "whenDeletesInBattle" // "When this Digimon deletes [an opponent's Digimon] in battle"
  | "whenOneOfYoursDigivolves" // "When one of your Digimon digivolves"
  | "onDeletionOf" // "When [a Digimon] is deleted"
  | "whenSecurityRemoved" // "When a card is removed from your/your opponent's security"
  | "whenAddSecurity" // "When cards are added to your/your opponent's security stack" (documented behavior EffectTiming.OnAddSecurity)
  | "onAddDigivolutionCards" // "When [Tamer] cards are placed in this Digimon's digivolution cards"
  | "whenPlayed" // "When [a Digimon matching sourceFilter] is played" / "When you play [X]"
  | "whenOptionPlayed" // "When an Option card is placed in the battle area" (option-permanent placement seam)
  | "whenLeavesPlay" // "When [this/a] Digimon leaves the battle area" (non-replacement reaction)
  | "whenLinked" // "When this Digimon gets linked" / "When a card is linked to this Digimon"
  | "whenLinkTrashed" // "When a link card is trashed (by an effect)" — a genuine trash, NOT a link-card replace (KB EX10-062 Q5172 / EX10-073 Q5188)
  | "whenDigivolutionTrashed" // "When a digivolution card is trashed by an effect" — a genuine effect-trash, NOT a return-to-hand bounce-clear (KB P-004 Q4113)
  | "whenOptionUsed" // "When you use an Option card's effect" (BT19-040 token watcher); the use verb lands in 08-06, the fire-hook seam is defined here
  | "onDigivolutionCardDiscarded" // "When a digivolution card is trashed by an effect" — individual-card trashed event (BT10-006, BT14-083)
  | "onDigivolutionCardsDiscardedBatch" // simultaneous exact-source reactions before discarded watchers are recomputed away
  | "onDigiBurstCardDiscarded" // simultaneous batch restricted to cards paid for a Digi-Burst cost
  | "onDigivolutionCardReturnToDeckBottom" // "When [a matching card] is placed from this Digimon's digivolution cards at the bottom of its owner's deck" (BT11-065)
  | "onDiscardLibrary" // "When a card in a player's deck is trashed" — library mill event (BT14-077)
  | "startOfYourMainPhase" // granted "[Start of Your Main Phase] ..." trigger fired at the watched permanent's owner's main-phase start (documented behavior EffectTiming.OnStartMainPhase)
  | "endOfTurn" // granted "[End of Your Turn] ..." trigger fired at the owner's turn end (documented behavior EffectTiming.OnEndTurn / UntilOwnerTurnEnd) — e.g. EX10-035's delayed self-delete
  | "whenTrashedFromDigivolutionCards" // "When this card is trashed from digivolution cards"
  | "whenEffectSuspends" // "When this Digimon is suspended by an effect"
  | "whenEffectTrashes" // "When a card is trashed by an effect"
  | "whenOpponentDraws" // "When your opponent draws a card"
  | "whenCardAddedToSecurity" // "When a card is added to security"
  | "opponentAddsSecurityToHand" // "When your opponent adds a security card to their hand"
  | "whenCardPlacedInDigivolution" // "When a card is placed in digivolution cards"
  | "whenMovedFromBreeding" // "When a Digimon moves from the breeding area"
  | "whenBattleWon" // "When this Digimon wins a battle"
  | "whenHandCardTrashed" // "When a card in your hand is trashed"
  | "whenHandTrashed" // "When your hand is trashed from" — fires once per trash ACTION (KB Q6400/Q6401), not per card
  | "whenTrashedFromSecurity" // "When a card is trashed from security"
  | "whenTrashedFromHand" // "When a card is trashed from your hand"
  | "whenEffectAddsToHand" // "When an effect adds a card to hand"
  | "whenEffectAddsToOpponentHand" // "When an effect adds cards to your opponent's hand" — ANY effect-driven hand addition (draw/return/reveal-add), NOT the normal draw-phase draw and NOT only the draw action (cf. whenOpponentDraws)
  | "whenDigimonWouldLeave" // "When one of your Millenniummon would leave the battle area" — ＜Delay＞ watcher event (BT19-099); aliases whenLeavesPlay at runtime
  | "wouldBeReturned" // "When [matching Digimon] WOULD BE returned to hand/deck" (BT20-074; CAP-C-11)
  | "whenTrashedByEffect" // "When [this card] is trashed by an effect while in the battle area" (BT19-093; CAP-E8)
  | "whenTrashedFromDeck" // "When this card is trashed from the deck" (BT19-097; CAP-H-01)
  | "whenCheckedFaceUpSecurity" // "When your Digimon checks a face-up security card" (BT20-055; CAP-H-03)
  | "raw";

export interface SubTriggerAction extends ActionBase {
  kind: "SubTrigger";
  event: SubTriggerEvent;
  /**
   * Keep this timed watcher at the activating-player scope instead of anchoring it to the
   * source permanent. This models resolved effects that continue to affect matching permanents
   * entering later even if the source leaves play (BT10-016 Q1945). Requires `duration` so the
   * retained activation context has an explicit expiry boundary.
   */
  playerScoped?: boolean;
  /** Which permanent the sub-trigger watches (defaults to the source). */
  on?: Target;
  /**
   * For onDeletionOf / onAddDigivolutionCards: which cards' event arms the trigger
   * ("your Tokens or Digimon with the [Puppet] trait is deleted", "Tamer cards are
   * placed"). When present, the engine fires the sub-effect only for a matching card.
   */
  sourceFilter?: Filter;
  /** Restrict the card whose effect produced the event (for example, "by [Rasenmon]'s effect"). */
  effectSourceFilter?: Filter;
  /**
   * Do not fire when this watcher card's own effect caused the deck trash.
   * Used by effects such as EX2-039 ("if it wasn't trashed by this card's effect").
   */
  excludeSelfEffect?: boolean;
  /**
   * An optional fire-TIME gate evaluated against the firing event's payload (TriggerInfo),
   * not a battle-area subject — for events whose gate is on the event data itself rather than
   * a triggering permanent. whenAddSecurity uses it for "your security" + the [Zaxon]/[Royal
   * Base] trait check on the just-added cards (BT23-083); the watcher body is skipped entirely
   * when it does not hold, so the body's mandatory tail never runs on an off-gate event. This
   * is the reusable fire-time predicate (RESEARCH Pattern: subtrigger fire-time condition).
   */
  fireCondition?: Condition;
  /**
   * Controller scope of the EFFECT that drove the event, for events that carry an acting-effect
   * seat (currently whenEffectSuspends). "mine" => only the watcher controller's OWN effect
   * `EffectSourceCard.Owner == card.Owner`). Absent => ANY effect's suspension fires it (BT10-004
   */
  bySourceController?: "mine" | "opponent";
  /** What runs when the sub-trigger fires. */
  actions: Action[];
  /**
   * Lifecycle of a GRANTED watcher installed on a chosen permanent ("until that owner's
   * (documented behavior): `untilOpponentTurnEnd` => the grant clears at the watched permanent's
   * owner's turn end. Absent => the watcher persists until its anchor leaves the field.
   */
  duration?: EffectDurationRef;
  /** Original prose for the trigger clause (diagnostics + unsupported routing). */
  raw: string;
  /** Internal text before recursive compilation. */
  _innerText?: string;
  /** Filter that must match the triggering card. */
  triggerFilter?: Filter;
  /**
   * When several permanents satisfy the watcher's event simultaneously (e.g. multiple matching
   * Digimon leave at once), the controller picks ONE to drive the body (BT19-099 ＜Delay＞:
   * the chosen leaving Digimon is the cost reference for `relativeToLeavingDigimon`). The
   * runtime already fires the watcher per-leaving-permanent, so this single-subject default
   * matches the field; explicit multi-leave disambiguation is a refinement.
   */
  pickOne?: boolean;
  /**
   * The sub-trigger fires at most once per trigger-timing window, even if multiple matching
   * events occur simultaneously (e.g. two same-named Digimon played via token creation).
   * KB Q2814 (BT2-053): "triggers only once even when multiple same-named Digimon are played."
   * Implemented by skipping subsequent fires that share the same `effectKey + timingId`.
   */
  oncePerTiming?: boolean;
  /** Stable effect key synthesized for a containing `[Once Per Turn]` continuous watcher. */
  oncePerTurnKey?: string;
  /**
   * One-shot watcher: it unsubscribes the first time it actually fires (its gates held and its
   * body ran), instead of persisting until its anchor leaves the field. This is the "at the NEXT
   * end of your opponent's turn" shape — EX3-069, whose KB Q5722 states the played Digimon is
   * deleted only at the FIRST opponent turn end after the play, so a Digimon that survives that
   * deletion is NOT deleted at the following opponent turns' ends.
   */
  once?: boolean;
}

/** What a replacement effect does instead of / before the replaced event. */
export type ReplacementEvent =
  | "wouldLeavePlay" // "When this Digimon would leave the battle area ..."
  | "wouldBeDeleted" // "When this Digimon would be deleted ..."
  | "wouldBePlayed" // "When this card would be played ..."
  | "wouldDigivolve" // "When this would digivolve ..."
  | "wouldLeaveBattleArea" // "When this Digimon would leave the battle area"
  | "raw";

export interface ReplacementAction extends ActionBase {
  kind: "Replacement";
  event: ReplacementEvent;
  on?: Target;
  /**
   * "reduceCost" => reduce play/digivolve cost; "prevent" => the event doesn't happen (by a
   * cost); "instead" => do `actions` instead. Optional: the prose compiler sometimes emits the
   * mode as a NESTED `{kind:"Prevent"}` or nested reduceCost `Replacement` inside `actions`
   * instead of setting it here (BT18-082, BT22-079, BT23-073) — `runReplacement` derives the
   * effective mode from those nested shapes when this is absent.
   */
  mode?: "reduceCost" | "increaseCost" | "prevent" | "instead";
  /** For reduceCost/increaseCost. */
  amount?: number;
  /**
   * Alternative reduceCost amounts the controller chooses BETWEEN — mutually exclusive,
   * never summed — for text that offers a base reduction plus a conditional larger
   * reduction "instead" (EX6-006: "reduce the play cost by 3 [...] reduce the play cost
   * by 4 instead" when a digivolution-card-name threshold is met; KB Q3700 confirms the
   * controller may still pick the smaller amount even when eligible for the larger one).
   * Each entry's own `condition` gates whether it is currently offered; when only one
   * entry is eligible it installs without a prompt, when none are eligible nothing
   * installs. Overrides a flat `amount` when present.
   */
  amountChoices?: { amount: number; condition?: Condition; raw?: string }[];
  /** Filter restricting which cards this replacement applies to ("when a Digimon would be played"). */
  sourceFilter?: Filter;
  /**
   * For a wouldDigivolve cost-reduction: the digivolution-RESULT filter the reduction
   * applies to ("when digivolving into a multicolored blue/red Digimon, reduce the cost
   */
  into?: Filter;
  /** What to do instead / as the replacement payload. */
  actions?: Action[];
  /**
   * For a "prevent" leave/delete replacement: which permanents the reaction protects ("when
   * THIS Digimon" => self; "when any of your [X] trait Digimon" => a filter). Absent => self.
   */
  target?: Target;
  /**
   * ("they don't leave") rather than one chosen permanent ("1 of those doesn't leave").
   */
  affectsAll?: boolean;
  /**
   * For "prevent": the qualifier on the removal cause the reaction watches. `byOpponentEffect`
   * = only the opponent's effects; `otherThanYourEffect` = anything except your own effects;
   * `byEffect` = any effect; `any` = any removal. The prevention's cost (ActionBase.cost) is
   * the gate the controller pays to prevent.
   */
  leaveCause?: "byOpponentEffect" | "otherThanYourEffect" | "byEffect" | "byBattle" | "otherThanBattle" | "any";
  /**
   * For "prevent": true when the protection is "can't LEAVE the battle area other than by
   * deletion" (documented behavior `rule implementation` "Can't leave battle area except by deletion effect",
   * EX6-044). A move/bounce/return is prevented, but a DELETION is NOT (KB EX6-044 Q3771: a
   * deletion still removes it). The consult passes whether the removal is a bounce; when
   * `exceptDeletion` is set, a NON-bounce removal (deletion) is allowed through (not prevented).
   * Absent => the prevent covers any matching leave (delete + bounce), per its `event`.
   */
  exceptDeletion?: boolean;
  /**
   * For ＜Digisorption＞ redirect (BT3-056 Tyranomon): when true and the mode is "reduceCost",
   * the Replacement's suspend cost is paid by the OPPONENT (opponent's Digimon are suspended),
   * ＜Digisorption＞ suspend cost from the controller's permanents to the opponent's. Absent =>
   * standard behavior (controller suspends their own Digimon).
   */
  digisorptionRedirect?: boolean;
  /**
   * Side effects that activate alongside this Replacement when its cost is paid. Each entry is an
   * `Action` that modifies the play environment for the current play event. Currently used only
   * for `AllowDigiXrosMaterialsFromTrash` (BT21-030): placing a [Shoutmon] under the card also
   * unlocks trash as a valid source zone for DigiXros materials.
   */
  additionalEffects?: Action[];
  /**
   * Dynamic ＜Delay＞ replacement gate. The replacement can only be used after the source has an
   * armed Delay keyword grant; using it consumes the grant and trashes the source before payload.
   */
  requiresDelayArmed?: true;
  raw: string;
}

/**
 * Legacy nested prevention payload emitted inside `Replacement.actions`, plus a small number of
 * direct prevention actions. Nested `Prevent` is normalized by `runReplacement`; direct `Prevent`
 * is interpreted as a conservative `wouldLeavePlay` prevention for the source.
 */
export interface PreventAction extends ActionBase {
  kind: "Prevent";
  mode?: "leavePlay" | "delete" | "battle" | string;
  target?: Target;
  affectsAll?: boolean;
  leaveCause?: ReplacementAction["leaveCause"];
}
