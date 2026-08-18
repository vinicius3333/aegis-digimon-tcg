// Running one CardEffect, and deciding which timing window it belongs to.

import type { Effect } from "../Effect.js";
import type { EffectContext } from "../EffectContext.js";
import {
  activated,
  beforePayCost,
  breeding,
  colorWaiverStatic,
  digivolveCostStatic,
  inTrash,
  onAddHand,
  onDeletion,
  onPlay,
  security,
  staticModifier,
  turnTiming,
  whenAttacking,
  whenDigivolving,
  whenTrashedFromBattleArea,
} from "../builders.js";
import type { BuilderOptions } from "../builders.js";
import { canAttemptDnaDigivolve } from "./actions/dna.js";
import { evaluateCondition } from "./conditions.js";
import { canPayCost } from "./costs.js";
import { installEffectRunner, runAction } from "./dispatch.js";
import { ACTION_TYPE_KEYWORDS } from "./errors.js";
import { isBlastDigivolveMarker } from "./registration/keywords.js";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Action, CardEffect } from "@aegis/shared";

// ---------------------------------------------------------------------------
// IR -> EffectModule factory
// ---------------------------------------------------------------------------

/**
 * Map an IR trigger + the source flags to an engine EffectTiming. Returns
 * undefined for triggers with no current EffectTiming home (the card simply
 * contributes nothing at any timing for that effect — visible as "none" stub).
 */
function timingForTrigger(effect: CardEffect): EffectTiming | undefined {
  if (effect.isSecurity) return EffectTiming.SecuritySkill;
  switch (effect.trigger) {
    case "OnPlay":
      return EffectTiming.OnPlay;
    case "BeforePayCost":
      // "When this card would be played" — the pay-time window fired by the play action for the
      // in-hand card BEFORE memory is paid (EX9-043 / BT25-076 interactive cost reduction).
      return EffectTiming.BeforePayCost;
    case "WhenDigivolving":
      return EffectTiming.WhenDigivolving;
    case "WhenAttacking":
      return EffectTiming.OnUseAttack;
    case "WhenBlocked":
      return EffectTiming.OnBlockAnyone;
    case "OnDeletion":
      return EffectTiming.OnDestroyedAnyone;
    case "EndOfAttack":
      return EffectTiming.OnEndAttack;
    case "WhenBattleDeleteOpponent":
      return EffectTiming.OnBattleDeleteOpponent;
    case "whenTrashedFromBattleArea":
      return EffectTiming.WhenTrashedFromBattleArea;
    case "StartOfYourTurn":
    case "StartOfOpponentsTurn":
      return EffectTiming.OnStartTurn;
    case "StartOfYourMainPhase":
    case "StartOfOpponentsMainPhase":
      return EffectTiming.OnStartMainPhase;
    case "EndOfYourTurn":
    case "EndOfOpponentsTurn":
    case "EndOfAllTurns":
      return EffectTiming.OnEndTurn;
    case "Main":
      // A ＜Delay＞-keyworded [Main] clause is NOT the on-play option effect — it is the
      // delayed activatable ("by trashing this card in your battle area, [payload]; can't
      // activate the turn it enters"), surfaced as an OnDeclaration ability on the option
      // permanent the on-play effect placed. Routing it here keeps it OFF the OnUseOption play
      // resolution so it no longer fires immediately on play.
      if ((effect.keywords ?? []).some((kw) => kw.keyword === "Delay")) {
        return EffectTiming.OnDeclaration;
      }
      return EffectTiming.OnUseOption;
    case "Security":
      return EffectTiming.SecuritySkill;
    case "Hand":
      return EffectTiming.OnDeclaration;
    case "Counter":
      // A ＜Blast Digivolve＞/＜Blast DNA Digivolve＞-keyworded "Counter" entry is NOT a real
      // [Counter] effect — it's the compiler's marker for those keywords (§16-26/§16-31; see
      // BT14-014/AD1-005/BT19-050's empty-actions Counter entries and EX5-053's hand-written
      // self-GainKeyword variant, plus the "[Hand][Counter] marker" callout in
      // ch16c-deletion-and-advanced-keywords.test.ts's AD1-005 case — isBlastDigivolveMarker
      // recognizes both compile shapes). §16-26-1/§16-31-1's actual behavior — digivolving from
      // hand without paying the cost — is implemented at the `digivolve` verb (GameEngine's
      // digivolveDeps -> DigivolveDeps.costWaived, sourced from registerBlastDigivolveFromEffects'
      // hasBlastDigivolveKeyword registry below), NOT through this marker's IR routing: its
      // `actions` are empty, so there is nothing for the effect-activation framework to resolve
      // either way. Routing it here keeps it OFF the real §11-3 Counter Timing window (which
      // would otherwise offer a no-op/mistagged activation there) and back at its old
      // OnDeclaration home — already unreachable there (activateEffect.ts gates on the turn
      // player / Phase.Main / a board-placed source, none of which a defending player's hand
      // card satisfies), so this preserves prior behavior.
      if (isBlastDigivolveMarker(effect)) {
        return EffectTiming.OnDeclaration;
      }
      // §11-3 Counter Timing: activated by the non-turn (defending) player between
      // an attack's When Attacking effects and block timing, capped at 1 per attack
      // (§11-3-2) — its own window, distinct from the turn-player's OnDeclaration
      // [Main]-activation bucket (activateEffect.ts ACTIVATE_TIMING).
      return EffectTiming.OnCounterTiming;
    case "WhenMoving":
      // §15-16-16-1: "[When Moving] triggers at the point the card with that effect is
      // moved." — the engine's own OnMove window (GameEngine fires it exactly at the
      // breeding <-> battle move point), not the continuous/static bucket.
      return EffectTiming.OnMove;
    case "AllTurns":
    case "YourTurn":
    case "OpponentsTurn":
    case "Trash":
    case "Breeding":
    case "Rule":
    case "Static":
      return EffectTiming.None; // continuous / static window
    default:
      return EffectTiming.None;
  }
}

/**
 * Every EffectTiming window an effect contributes at. Usually one (timingForTrigger),
 * but a `[Main]` effect has TWO homes, reconciling the IR with the engine's two
 * distinct main windows:
 *   - {@link EffectTiming.OnUseOption} — an Option's [Main] body, fired by play-card
 *     when the Option resolves from hand.
 *   - {@link EffectTiming.OnDeclaration} — a player-activated [Main] ability on a
 *     permanent, reached via the `activateEffect` verb (ACTIVATE_TIMING). The IR files
 *     every `[Main]` under one trigger, so without also exposing it here a permanent's
 *     activated [Main] ability would be unreachable (the verb queries OnDeclaration).
 * The kernel/verb placement guards keep each correct: play-card only fires OnUseOption
 * for the resolving Option, and activateEffect only reaches a controlled source.
 *
 * The OnDeclaration co-home must NOT be given to an Option's ON-PLAY BODY — its first [Main]
 * clause, the one play-card fires via OnUseOption. Exposing that at OnDeclaration too would make
 * an Option that places itself as a battle-area permanent (the whole option-permanent family)
 * re-activate its play effect on the permanent. A LATER [Main] clause on an option permanent IS a
 * genuine activated ability (e.g. P-103/P-104's "trash self, then digivolve") and keeps the
 * co-home; a ＜Delay＞ clause is keyworded and already routes to OnDeclaration via timingForTrigger.
 * `isOptionPlayBody` (computed by irCardModule, which tracks the first plain [Main]) flags the one
 * clause to restrict.
 */
export function timingsForTrigger(effect: CardEffect, isOptionPlayBody: boolean): EffectTiming[] {
  const primary = timingForTrigger(effect);
  if (primary === undefined) return [];
  const isDelay = (effect.keywords ?? []).some((kw) => kw.keyword === "Delay");
  if (!effect.isSecurity && effect.trigger === "Main" && !isDelay && !isOptionPlayBody) {
    return [EffectTiming.OnUseOption, EffectTiming.OnDeclaration];
  }
  return [primary];
}

/**
 * A `Static` effect whose only job is a digivolve-cost CostModifier (e.g. BT7-040's
 * "When digivolving into this card from your hand, the cost = your security count")
 * is HAND-RESIDENT: the source is the digivolution target sitting in hand, so it must
 * NOT carry the on-field base guard that `staticModifier` applies (which would make it
 * inert). Detect that shape so the IR routes it through `digivolveCostStatic`.
 */
function isHandResidentDigivolveCostStatic(effect: CardEffect): boolean {
  const isStaticTrigger = effect.trigger === "Static" || effect.trigger === "Rule";
  if (!isStaticTrigger) return false;
  const actions = effect.actions ?? [];
  if (actions.length === 0) return false;
  // Gate on the POSITIVE hand-resident marker the runtime record emits (documented behavior
  // `HandCards.Contains(card)` + `cardSource == card`), not merely on "all actions are
  // digivolve CostModifiers". An on-field digivolve-cost static (which lacks the marker)
  // must NOT lose its on-field base guard via this hand-permissive route (WR-01).
  return actions.every((a) => a.kind === "CostModifier" && a.handResident === true);
}

/**
 * A `Static`/`Rule` effect whose actions are ALL `WaiveColorRequirement` (§16-42 ＜Use
 * Req.＞ and the pre-existing corpus idiom it now matches — EX2-072, BT19-093, BT7-110,
 * ...) must not carry `staticModifier`'s on-field base guard. `WaiveColorRequirement`'s
 * only supported shape is self-targeted, so the effect always describes "waive the SAME
 * card's own color requirement" — checked at PLAY time (playCard.ts) or DIGIVOLVE time
 * (digivolve.ts), i.e. while the card is off the battle area. Requiring on-field presence
 * first makes the waiver permanently inert for that moment (see `colorWaiverStatic` in
 * builders.ts for the full writeup). Scoped narrowly, mirroring
 * `isHandResidentDigivolveCostStatic`: an ordinary Static effect that ALSO does something
 * else keeps the on-field guard untouched.
 */
function isColorWaiverStatic(effect: CardEffect): boolean {
  const isStaticTrigger = effect.trigger === "Static" || effect.trigger === "Rule";
  if (!isStaticTrigger) return false;
  const actions = effect.actions ?? [];
  if (actions.length === 0) return false;
  return actions.every((a) => a.kind === "WaiveColorRequirement");
}

/**
 * A Static/Rule/YourTurn/AllTurns/OpponentsTurn effect whose actions are ALL a SubTrigger
 * install for a HAND-anchor-less event ("when this card is trashed from the hand", "when
 * your hand is trashed" — BT24-013/-026/-045) must not carry `staticModifier`'s on-field
 * base guard: the watching card is resident in HAND when these events are relevant, never
 * on the battle area (the same shape `isColorWaiverStatic`/`isHandResidentDigivolveCostStatic`
 * handle one gate over). Without this, `canTrigger` fails before the effect ever reaches
 * `resolve()`, so the eighth-gap anchor-less `subscribeSubTrigger` fix never gets a chance
 * to install the watcher at all — proven empirically (BT24-013 registered in hand, trashed,
 * no draw fired) even after the anchor fix alone.
 */
const HAND_TRASH_ANCHOR_LESS_EVENTS = new Set(["whenTrashedFromHand", "whenHandTrashed"]);

function isHandTrashWatcherHost(effect: CardEffect): boolean {
  // Inherited reactions only exist while their card is in a Digimon's stack. Routing them
  // through the hand-resident builder makes loose copies in hand/trash install phantom
  // watchers (BT6-006/-069/-073), so a later discard can trigger cards that were never in play.
  if (effect.isInherited) return false;
  const continuousLikeTrigger =
    effect.trigger === "Static" ||
    effect.trigger === "Rule" ||
    effect.trigger === "YourTurn" ||
    effect.trigger === "AllTurns" ||
    effect.trigger === "OpponentsTurn";
  if (!continuousLikeTrigger) return false;
  const actions = effect.actions ?? [];
  if (actions.length === 0) return false;
  return actions.every(
    (a) => a.kind === "SubTrigger" && HAND_TRASH_ANCHOR_LESS_EVENTS.has((a as { event?: string }).event ?? ""),
  );
}

/** Pick the timing builder that matches an IR trigger. */
export function builderForTrigger(effect: CardEffect): (opts: BuilderOptions) => Effect {
  if (effect.isSecurity || effect.trigger === "Security") return security;
  if (isHandResidentDigivolveCostStatic(effect)) return digivolveCostStatic;
  if (isColorWaiverStatic(effect)) return colorWaiverStatic;
  if (isHandTrashWatcherHost(effect)) return onAddHand;
  // A `{Breeding}` timed effect (BT22-007 {Breeding}[Start of Your Main Phase]) keeps its timing
  // (OnStartMainPhase) and turn-owner gate, but its base "still-relevant" guard is "in breeding"
  // rather than "on the battle area". The `breeding` builder supplies
  // that base guard; turnOwnerGuard(effect.trigger) is still ANDed in via the builder `when`.
  if (effect.isBreeding) return breeding;
  // `[Trash]`-tagged timed/continuous effects (§15-14-3-1, e.g. BT26-078's `[Trash][Your
  // Turn]`) keep their timing but swap the base "still-relevant" guard from on-field to
  // actual trash residency — mirroring `effect.isBreeding` above. `[Trash][Main]` is
  // handled separately (see `activated`'s `isFromTrash` opt): it shares the `Main`
  // trigger with every ordinary activated ability, so it cannot be routed by builder
  // selection alone.
  if (effect.isFromTrash && effect.trigger !== "Main") return inTrash;
  switch (effect.trigger) {
    case "OnPlay":
      return onPlay;
    case "BeforePayCost":
      return beforePayCost;
    case "WhenDigivolving":
      return whenDigivolving;
    case "WhenAttacking":
      return whenAttacking;
    case "OnDeletion":
      return onDeletion;
    case "whenTrashedFromBattleArea":
      return whenTrashedFromBattleArea;
    case "Main":
      return activated;
    case "Hand":
      return onAddHand;
    case "Trash":
      return inTrash;
    case "Breeding":
      return breeding;
    case "AllTurns":
    case "YourTurn":
    case "OpponentsTurn":
    case "Static":
    case "Rule":
      return staticModifier;
    default:
      return turnTiming;
  }
}

/**
 * Mark every top-level SubTrigger/Replacement action of a continuous-window ＜Delay＞ effect
 * (CAP-E14 fix, comprehensive rules §16-17) with an INTRINSIC delay gate: "while this card is
 * in the battle area, by trashing it, the effect activates" applies regardless of whether the
 * arming condition is a reactive event (`[All Turns] When X, ＜Delay＞`) rather than a player-
 * declared `[Main]` window — the OnDeclaration branch above already covers the latter. Skips
 * any action that already opts into the separate GainKeyword-armed model
 * (`requiresDelayArmed`, e.g. BT17-097's dynamically-granted Delay) — that model's grant/consume
 * gate is a deliberate, distinct encoding and is left untouched. `delayArmedIntrinsic` is a
 * synthesized marker read by `runSubTrigger`/`runReplacement`, not part of the compiled IR.
 */
export function withIntrinsicDelayGate(effect: CardEffect): CardEffect {
  const actions = (effect.actions ?? []).map((action): typeof action => {
    if (action.kind !== "SubTrigger" && action.kind !== "Replacement") return action;
    if ((action as { requiresDelayArmed?: boolean }).requiresDelayArmed === true) return action;
    return { ...action, delayArmedIntrinsic: true } as unknown as typeof action;
  });
  return { ...effect, actions };
}

/** Carry a continuous effect's printed frequency onto the watcher that actually fires. */
export function withSubTriggerFrequency(effect: CardEffect, effectKey: string): CardEffect {
  if (effect.frequency !== "OncePerTurn") return effect;
  const actions = (effect.actions ?? []).map((action): typeof action =>
    action.kind === "SubTrigger" ? ({ ...action, oncePerTurnKey: effectKey } as typeof action) : action,
  );
  return { ...effect, actions };
}

/**
 * A continuous effect that reads a live keyword depends on keyword-provider effects from the
 * same board. This includes `selfHasKeyword` conditions and TargetFilter keyword clauses such
 * as Craniamon's "all of your Digimon with Blocker" restriction. Providers must resolve at
 * priority 0 and these consumers at priority 1, otherwise board enumeration order can make a
 * conferred/inherited keyword invisible for the whole continuous pass.
 */
export function readsSelfKeyword(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(readsSelfKeyword);
  const record = value as Record<string, unknown>;
  if (record.kind === "selfHasKeyword") return true;
  const filter = record.filter;
  if (filter !== null && typeof filter === "object" && !Array.isArray(filter)) {
    const candidate = filter as Record<string, unknown>;
    if (
      (Array.isArray(candidate.keywords) && candidate.keywords.length > 0) ||
      (Array.isArray(candidate.excludeKeywords) && candidate.excludeKeywords.length > 0)
    ) {
      return true;
    }
  }
  return Object.values(record).some(readsSelfKeyword);
}

/**
 * (`(!yourTurn || IsOwnerTurn) && (!opponentTurn || IsOpponentTurn)`). A `[Your Turn]` /
 * StartOf-Your / EndOf-Your effect may fire only while its owner is the turn player; the
 * `[Opponent's Turn]` variants only on the opponent's turn. AllTurns / Static / Rule have no
 * turn gate. The IR carries the owner in the trigger string but emits no `isYourTurn`
 * condition, so the gate is derived here (and routed through the builder's `when`, ANDed
 * into `canTrigger`) rather than read from a `when` clause.
 */
export function turnOwnerGuard(trigger: CardEffect["trigger"]): ((ctx: EffectContext) => boolean) | undefined {
  switch (trigger) {
    case "YourTurn":
    case "StartOfYourTurn":
    case "StartOfYourMainPhase":
    case "EndOfYourTurn":
      return (ctx) => ctx.game.state.turnSeat === ctx.source.ownerSeat;
    case "OpponentsTurn":
    case "StartOfOpponentsTurn":
    case "StartOfOpponentsMainPhase":
    case "EndOfOpponentsTurn":
      return (ctx) => ctx.game.state.turnSeat === ctx.game.opponentOf(ctx.source.ownerSeat);
    default:
      return undefined;
  }
}

/** Run all actions of a CardEffect in order against the context. */
export async function runEffect(ctx: EffectContext, effect: CardEffect): Promise<void> {
  if (effect.condition && !evaluateCondition(ctx, effect.condition)) return;
  // Turn-condition gate for triggers that carry an explicit turnCondition field rather than
  // encoding the turn direction in the trigger name (e.g. whenTrashedFromBattleArea, BT19-095).
  if (effect.turnCondition !== undefined) {
    const isOwnerTurn = ctx.game.state.turnSeat === ctx.source.ownerSeat;
    if (effect.turnCondition === "yourTurn" && !isOwnerTurn) return;
    if (effect.turnCondition === "opponentsTurn" && isOwnerTurn) return;
  }
  // Fresh selection-binding store for this resolution (SelectBind -> later relativeTo refs).
  const ctxWithSelections: EffectContext = ctx.selections ? ctx : { ...ctx, selections: new Map() };
  ctxWithSelections.activeTiming = effect.trigger;
  ctxWithSelections.activeEffectText = effect.isInherited
    ? ctx.source.definition.inheritedEffectText
    : effect.isSecurity
      ? ctx.source.definition.securityEffectText
      : ctx.source.definition.effectText;
  const actions = effect.actions ?? [];
  if (actions.length === 0 && (effect.keywords?.length ?? 0) > 0) {
    const durationStr =
      effect.trigger === "Static" || effect.trigger === "Rule" || effect.trigger === "YourTurn"
        ? "permanent"
        : "forTheTurn";
    for (const kw of effect.keywords ?? []) {
      await runAction(ctxWithSelections, {
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: {
          keyword: kw.keyword,
          ...(kw.amount !== undefined ? { amount: kw.amount } : {}),
        },
        duration: durationStr,
      });
    }
    return;
  }
  if (effect.trigger === "Static") {
    for (const keyword of effect.keywords ?? []) {
      if (keyword.keyword === "Reboot" || ACTION_TYPE_KEYWORDS.has(keyword.keyword)) continue;
      await runAction(ctxWithSelections, {
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: {
          keyword: keyword.keyword,
          ...(keyword.amount !== undefined ? { amount: keyword.amount } : {}),
        },
        duration: "permanent",
      });
    }
  }
  const isRebootMarker =
    effect.trigger === "Static" && (effect.keywords ?? []).some((keyword) => keyword.keyword === "Reboot");
  if (isRebootMarker) {
    const self = ctxWithSelections.source.permanent();
    if (self !== undefined) {
      ctxWithSelections.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.Permanent);
    }
  }
  for (const action of actions) {
    // Legacy compiled Reboot records carry a self-Unsuspend action beside the keyword
    // marker. It describes what Reboot does during the opponent's unsuspend phase; it is
    // not a continuously re-fired "unsuspend now" action. Executing it in the static pass
    // makes a Reboot Digimon stand back up immediately after declaring an attack.
    if (isRebootMarker && action.kind === "Unsuspend") continue;
    const abort = await runAction(ctxWithSelections, action);
    if (abort) break;
  }
}

/**
 * CR §15-6-3: "an effect can't be activated when none of its processing conditions are
 * met." CR §15-8-4-3-1: "a player can only declare activation of an activation-type effect
 * while its processing conditions are met" — and an action's own cost ("by paying N cost")
 * is such a processing condition: declaring an activation whose cost can't be paid must be
 * refused outright, not accepted and left to fail at resolution.
 *
 * A whole-effect `condition` is a hard gate. Below that, an effect's actions are a
 * DISJUNCTION of processing conditions (condition AND cost together) — activation is
 * refused only when EVERY action is gated (by a condition, a cost, or both) and NONE of
 * them currently has both its condition met and its cost payable; an effect with at least
 * one action that carries neither gate always stays activatable. `RawUnparsed` actions are
 * skipped, mirroring `runAction`'s own handling of unparsed IR.
 *
 * A `raw` (unparsed) condition, or a cost kind `canPayCost` cannot evaluate, is excluded
 * from the gate on BOTH sides: the interpreter cannot tell whether it holds/is payable, so
 * it must not silently REFUSE an activation the game would actually allow
 * (evaluateCondition's own "unrecognized => unmet" default, and canPayCost's own "unknown =>
 * payable" default, exist as resolve-time no-op safety nets, not as license to gate
 * activation on a guess).
 */
export function canActivateEffect(ctx: EffectContext, effect: CardEffect): boolean {
  if (effect.condition && effect.condition.kind !== "raw" && !evaluateCondition(ctx, effect.condition)) return false;
  const relevantActions = (effect.actions ?? []).filter((action) => action.kind !== "RawUnparsed");
  const isGated = (action: Action) =>
    action.kind === "DnaDigivolve" ||
    (action.kind !== "ConditionalBranch" && action.condition !== undefined && action.condition.kind !== "raw") ||
    (action.cost !== undefined && action.cost.kind !== "raw");
  // A leading abort-on-decline action is the activation gate for the complete clause:
  // "If ..., by paying ..., do X. Then, do Y." The dependent `Then` action is often
  // mechanically ungated because it consumes a binding produced by X; treating Y as an
  // independent processing path would allow the player to declare the effect when X's
  // condition/cost is impossible (BT10-025). Mirror runEffect's ordered abort semantics here.
  const leadingAction = relevantActions[0];
  if (leadingAction?.abortOnDecline === true && isGated(leadingAction)) {
    const intrinsicPossible = leadingAction.kind !== "DnaDigivolve" || canAttemptDnaDigivolve(ctx, leadingAction);
    const conditionMet =
      leadingAction.condition === undefined ||
      leadingAction.condition.kind === "raw" ||
      evaluateCondition(ctx, leadingAction.condition);
    const costPayable = leadingAction.cost === undefined || canPayCost(ctx, leadingAction.cost);
    return intrinsicPossible && conditionMet && costPayable;
  }
  const gatedActions = relevantActions.filter(isGated);
  const ungatedCount = relevantActions.length - gatedActions.length;
  if (gatedActions.length === 0 || ungatedCount > 0) return true;
  return gatedActions.some((action) => {
    const intrinsicPossible = action.kind !== "DnaDigivolve" || canAttemptDnaDigivolve(ctx, action);
    const conditionMet =
      action.condition === undefined || action.condition.kind === "raw" || evaluateCondition(ctx, action.condition);
    const costPayable = action.cost === undefined || canPayCost(ctx, action.cost);
    return intrinsicPossible && conditionMet && costPayable;
  });
}

installEffectRunner(runEffect);
