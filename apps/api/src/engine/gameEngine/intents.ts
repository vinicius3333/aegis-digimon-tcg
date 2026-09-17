import { peekCheckedCard } from "../security/checkedCard.js";
import {
  CardKind,
  EffectTiming,
  Phase,
  Permanent,
  type CardInstance,
  type Intent,
  type IntentResult,
  type RejectReason,
  type Seat,
  appFusionCostFor,
} from "@aegis/shared";
import { lookupDefinition } from "../cards/cardData.js";
import { handleReady, handleSurrender, handleEndPhase, handleRespondDecision } from "../intentRouter.js";
import { validateActivateEffect, applyActivateEffect, type ActivateEffectIntent } from "../actions/activateEffect.js";
import { effectiveNames } from "../effects/continuous.js";
import { blastDnaChoices } from "../actions/blastDnaDigivolve.js";
import { canActivate, canTrigger } from "../effects/kernel.js";
import { effectsOf } from "../effects/collect.js";
import { hasBlastDigivolveKeyword } from "../effects/interpreter.js";
import { logError } from "../../logger.js";
import {
  applyHatchEgg,
  applyMoveFromBreeding,
  type HatchEggIntent,
  type MoveFromBreedingIntent,
} from "../actions/breeding.js";
import {
  validateDigivolve,
  applyDigivolve,
  validatePlayCard,
  applyPlayCard,
  validateAttack,
  applyAttack,
  applyDeclareBlock,
  applyDeclineBlock,
  applyRespondAlliance,
  applyRespondEvade,
  applyRespondBarrier,
  type DigivolveIntent,
  type PlayCardIntent,
  validateDigiXros,
  applyDigiXros,
  type DigiXrosIntent,
  validateAssembly,
  applyAssembly,
  type AssemblyIntent,
  type AttackIntent,
  validateLinkCard,
  applyLinkCard,
  type LinkCardIntent,
  validateDnaDigivolve,
  applyDnaDigivolve,
  type DnaDigivolveIntent,
  validateRespondCounter,
  applyRespondCounter,
  type RespondCounterIntent,
} from "../actions/index.js";
import { ATTACK_BLOCKED_INTENTS, isBlastDigivolve, playableFromHand } from "./intentGating.js";
import {
  mapAssemblyReason,
  mapBreedingReason,
  mapDigivolveReason,
  mapDigiXrosReason,
  mapDnaDigivolveReason,
  mapLinkReason,
  mapPlayCardReason,
} from "./rejectionReasons.js";
import type { AppFusionValidation } from "./types.js";
import {
  activateEffectDeps,
  assemblyDeps,
  attackDeps,
  blockDeps,
  breedingDeps,
  combatDecisionDeps,
  digiXrosDeps,
  digivolveDeps,
  dnaDigivolveDeps,
  intentRouterDeps,
  linkCardDeps,
  playCardDeps,
  respondCounterDeps,
} from "./actionDeps.js";
import type { GameEngine } from "../GameEngine.js";

/**
 * Validate and apply a single client intent (subsystem: intent-protocol-and-room).
 * Mutates state only on success; every path returns a stable IntentResult the room
 * surfaces (the rejection codes are the API-CONTRACT section 4 vocabulary).
 *
 * Replaces all network transport RPC entry points (RoomManager / TurnStateMachine / OptionalSkill
 * / MultipleSkills RPCs): the only client->server channel is engine dispatch table.
 * Each verb's own action module enforces the validation contract (seat/turn ->
 * open-decision -> legality) and is server-authoritative.
 *
 * The decision gate is enforced per verb (and, for the always-available verbs,
 * deliberately bypassed): while a decision is open only respondDecision and
 * surrender are accepted. Every gated verb keys off the synchronized
 * state.pendingDecision (the contract's source of truth, which the DecisionManager
 * mirrors), so the action modules and the router agree.
 */
export function applyIntent(engine: GameEngine, seat: Seat, intent: Intent): IntentResult {
  const mainActionWhileResolving =
    engine.activeWindowToken !== undefined || engine.effectResolutionDepth > 0 || engine.optionResolutionDepth > 0;
  // Readiness guard. Main opens before its start-of-main timing finishes, so a fast client
  // can submit a verb while the turn has not actually been handed over; those are refused.
  // Once entry is finalized the engine SERIALIZES main verbs through `continueMainVerb`
  // instead, so a verb issued while some other effect window happens to be open is queued,
  // not rejected — refusing those would break the ordinary "act again immediately" path.
  // An open decision is the more specific refusal: each verb's own gate reports
  // `decision-pending` for it, so both readiness checks here yield to that gate.
  const noDecisionOpen = engine.state.pendingDecision === undefined;
  if (
    engine.mainEntryPending &&
    mainActionWhileResolving &&
    noDecisionOpen &&
    ["playCard", "appFusion", "digivolve", "attack", "activateEffect", "linkCard", "dnaDigivolve"].includes(intent.type)
  ) {
    return { ok: false, reason: "wrong-phase" };
  }
  // Q5335 (BT23-065): activating an effect is refused outright while ANOTHER effect is still
  // resolving, at any point in the turn. This one verb keeps the broad condition — it is a
  // rules restriction on activation timing, not the start-of-main readiness case above.
  if (mainActionWhileResolving && noDecisionOpen && intent.type === "activateEffect") {
    return { ok: false, reason: "wrong-phase" };
  }
  // A voluntary pass is DEFERRED, not refused, while the start-of-main entry is in flight.
  // The readiness invariant is that no main action takes effect before the turn is actually
  // handed to the player; ending the phase early satisfies that by being replayed at
  // finalize. Refusing it outright strands any client that passes as soon as Main appears
  // to open, which is exactly what the production turn drivers do.
  if (intent.type === "endPhase" && engine.mainEntryPending && mainActionWhileResolving) {
    engine.deferredEndPhaseSeat = seat;
    return { ok: true };
  }
  // CR section 11: an attack runs from declaration to the end of the battle as one
  // uninterrupted process. While it is in flight — including while it is parked on a
  // combat prompt the defending seat still owes an answer to (block, Counter Timing,
  // Alliance, Evade, Barrier) — no board verb is accepted from either seat. Those
  // prompts are mirrored in `state.combatWindow`, not in `state.pendingDecision`, so
  // the per-verb `decision-pending` gates do not see them; without engine the turn
  // player could play Digimon between a redirected attack and its battle, and end the
  // turn with the attack never resolved. The room's answer-timeout backstop
  // (`expireCombatWindow`) guarantees the window always closes, so engine cannot wedge
  // the turn. The combat response verbs, `respondDecision`, `ready` and `surrender`
  // stay open: they are how the attack makes progress or the match ends.
  if (
    engine.combat.currentAttackerId !== undefined &&
    ATTACK_BLOCKED_INTENTS.has(intent.type) &&
    !isBlastDigivolve(intent)
  ) {
    return { ok: false, reason: "wrong-phase" };
  }
  switch (intent.type) {
    case "playCard":
      return handlePlayCard(engine, seat, intent);

    case "appFusion":
      return handleAppFusion(engine, seat, intent);

    case "digivolve":
      return handleDigivolve(engine, seat, intent);

    case "attack":
      return handleAttack(engine, seat, intent);

    case "declareBlock":
      return applyDeclareBlock(blockDeps(engine), seat, intent);

    case "declineBlock":
      return applyDeclineBlock(blockDeps(engine), seat);

    case "respondCounter":
      return handleRespondCounter(engine, seat, intent);

    case "respondAlliance":
      return applyRespondAlliance(combatDecisionDeps(engine), seat, intent);

    case "respondEvade":
      return applyRespondEvade(combatDecisionDeps(engine), seat, intent);

    case "respondBarrier":
      return applyRespondBarrier(combatDecisionDeps(engine), seat, intent);

    case "activateEffect":
      return handleActivateEffect(engine, seat, intent);

    case "linkCard":
      return handleLinkCard(engine, seat, intent);

    case "dnaDigivolve":
      return handleDnaDigivolve(engine, seat, intent);

    case "endPhase":
      // During the Breeding phase, endPhase is "do nothing" — it skips the breeding
      // action window (API-CONTRACT "advance Main -> End (or skip Breeding action)").
      // During the Main phase it ends the turn (intentRouter / MainPhaseController).
      if (engine.state.phase === Phase.Breeding) {
        return handleBreedingSkip(engine, seat);
      }
      return handleEndPhase(intentRouterDeps(engine), seat);

    case "respondDecision":
      return handleRespondDecision(intentRouterDeps(engine), seat, intent);

    case "ready":
      return handleReady(intentRouterDeps(engine), seat);

    case "surrender":
      return handleSurrender(intentRouterDeps(engine), seat);

    case "mulligan":
      return engine.mulligan.answer(seat, intent.keep) ? { ok: true } : { ok: false, reason: "decision-pending" };

    case "hatchEgg":
      return handleHatchEgg(engine, seat, intent);

    case "moveFromBreeding":
      return handleMoveFromBreeding(engine, seat, intent);

    default: {
      // Exhaustiveness guard: a new Intent variant must be handled above.
      const exhaustive: never = intent;
      void exhaustive;
      return { ok: false, reason: "unknown-intent" };
    }
  }
}

/**
 * Re-evaluate the turn-end condition after a turn-player verb has resolved: end the
 * Main phase if the gauge has crossed to the opponent, then auto-end it if the turn
 * player has no remaining legal action. Must run AFTER a continuation-based verb's
 * awaited effect resolves — running it synchronously after dispatch would end the
 * turn on the play cost's cross before the On Play effect ever ran.
 */
export function checkTurnEndAfterVerb(engine: GameEngine): void {
  // Main becomes observable before its asynchronous entry timing has completely
  // unwound. If a client submits a verb in that interval, the entry finalizer and
  // any nested state sync must not end the phase from the already-paid memory cost;
  // the continuation's own final check will run after every effect and decision.
  if (engine.mainVerbContinuationsInFlight > 0) return;
  // Nested plays/digivolutions can invoke engine hook while the outer card effect is
  // still resolving. Blitz belongs after that whole effect window, never between its
  // clauses or ahead of their target selections.
  if (engine.activeWindowToken !== undefined) return;

  // Effects resolved inside an attack (for example ST12-10 playing Sistermon Ciel)
  // may restore memory and call engine hook before CombatController has released its
  // in-progress guard. At that instant every normal Main verb is intentionally
  // illegal, so `hasAnyMainPhaseAction` would mistake the transient combat window
  // for a dead Main phase and close the turn. The attack continuation calls engine
  // method again after `isAttacking` becomes false; only that final check may decide
  // whether the restored-memory turn remains open.
  if (engine.combat.isAttacking) return;

  // ＜Blitz＞ (§16-22): when memory has crossed to the opponent but the turn
  // player has an unsuspended Blitz Digimon that hasn't attacked engine turn, keep
  // the Main phase open for one more attack. Skip the turn-end check so the
  // player can declare the Blitz attack; after it resolves engine method is called
  // again and the turn ends normally.
  if (engine.memory.hasCrossedToOpponent()) {
    const accepted = engine.combat
      .blitzEligiblePermanentIds(engine.state.turnSeat)
      .find((permanentId) => engine.acceptedBlitzAttackers.has(permanentId));
    if (accepted !== undefined || engine.blitzDecisionInFlight) return;

    const candidate = engine.combat
      .blitzEligiblePermanentIds(engine.state.turnSeat)
      .find((permanentId) => !engine.resolvedBlitzOpportunities.has(permanentId));
    if (candidate !== undefined && engine.state.pendingDecision === undefined) {
      const permanent = engine.access.permanentById(candidate);
      engine.blitzDecisionInFlight = true;
      void engine.decisions
        .request({
          seat: engine.state.turnSeat,
          kind: "optional",
          promptText: "Activate Blitz?",
          ...(permanent?.topCard?.cardId !== undefined ? { sourceCardId: permanent.topCard.cardId } : {}),
          options: { promptKey: "activateBlitz" },
        })
        .then((response) => {
          engine.resolvedBlitzOpportunities.add(candidate);
          if (response.kind === "optional" && response.accept) {
            engine.acceptedBlitzAttackers.add(candidate);
            engine.projection.syncAttackTargets();
          }
        })
        .finally(() => {
          engine.blitzDecisionInFlight = false;
          checkTurnEndAfterVerb(engine);
        });
      return;
    }
  }
  engine.mainPhase.checkTurnEnd();
  if (engine.mainPhase.isOpen && !hasAnyMainPhaseAction(engine, engine.state.turnSeat)) {
    engine.mainPhase.endPhaseRequested(engine.state.turnSeat);
  }
}

export function isNewlyPlayedRushAttacker(engine: GameEngine, permanentId: string): boolean {
  const permanent = engine.access.permanentById(permanentId);
  return (
    permanent !== undefined &&
    engine.crossedMemoryRushAttackers.has(permanentId) &&
    permanent.controllerSeat === engine.state.turnSeat &&
    permanent.enterFieldTurnCount === engine.state.turnCount &&
    !permanent.isSuspended &&
    !engine.combat.attackedThisTurn.has(permanentId) &&
    engine.continuous.hasKeyword(permanentId, "Rush")
  );
}

/**
 * Track one accepted async Main verb and make its final turn-end check authoritative.
 *
 * `start` is a THUNK, not a promise: the verb must not begin until every previously
 * accepted verb has fully settled. Intents are gated on an open decision, but nothing
 * gated them on a verb whose triggers were merely still settling, so two resolutions
 * ran concurrently and both could reach a prompt — the second threw out of
 * `DecisionManager.request`, aborting a card's clause halfway (memory never gained, a
 * card never drawn) in whichever card lost the race.
 *
 * Only these turn-player verbs queue. The replies that DRIVE a running resolution —
 * respondDecision, respondCounter, and the combat decisions — deliberately bypass engine
 * seam, so serializing here cannot deadlock the chain they are answering.
 *
 * A verb arriving while nothing is in flight still begins SYNCHRONOUSLY, exactly as
 * before: a verb's synchronous prefix (paying cost, moving the card out of hand) has
 * always run by the time `applyIntent` returns, and callers read state expecting that.
 * Only a verb that arrives while another is still settling waits.
 *
 * The trade-off for that waiting verb is deliberate: it was validated when it arrived
 * but applies after the previous chain finishes, so it may find a board that moved.
 * That beats the alternative it replaces — applying against state another chain is
 * mutating underneath it.
 */
export function continueMainVerb<T>(
  engine: GameEngine,
  start: () => Promise<T>,
  onResolved: (value: T) => void,
  onRejected: (error: unknown) => void,
): void {
  const idle = engine.mainVerbContinuationsInFlight === 0;
  engine.mainVerbContinuationsInFlight += 1;
  const begun = idle ? start() : engine.mainVerbChain.then(start);
  const settled = begun.then(onResolved).catch(onRejected);
  // The queue tail must never carry a rejection forward, or one failed verb would
  // reject every verb queued behind it.
  engine.mainVerbChain = settled.then(
    () => {},
    () => {},
  );
  void settled.finally(() => {
    engine.mainVerbContinuationsInFlight -= 1;
    checkTurnEndAfterVerb(engine);
  });
}

/** Enforce that a crossed-memory attack is the single Blitz window the player accepted. */
export function handleAttack(engine: GameEngine, seat: Seat, intent: AttackIntent): IntentResult {
  if (
    engine.memory.hasCrossedToOpponent() &&
    !engine.acceptedBlitzAttackers.has(intent.attackerPermanentId) &&
    !isNewlyPlayedRushAttacker(engine, intent.attackerPermanentId)
  ) {
    return { ok: false, reason: engine.state.pendingDecision ? "decision-pending" : "wrong-phase" };
  }
  const deps = attackDeps(engine);
  const result = applyAttack(
    {
      ...deps,
      onCombatComplete: () => {
        engine.acceptedBlitzAttackers.delete(intent.attackerPermanentId);
        engine.crossedMemoryRushAttackers.delete(intent.attackerPermanentId);
        engine.resolvedBlitzOpportunities.add(intent.attackerPermanentId);
        engine.projection.syncAttackTargets();
        // Combat moves memory, so what the hand can afford moved with it.
        engine.projection.syncHandAffordances();
        checkTurnEndAfterVerb(engine);
        engine.hooks.onActionSettled?.(seat, "attack");
      },
    },
    seat,
    intent,
  );
  return result;
}

/**
 * Route the activateEffect verb (subsystem: intent-protocol-and-room). Validates
 * synchronously for the immediate IntentResult; on success runs the named [Main]
 * ability as a continuation (it may await player decisions, whose prompts arrive on
 * the decision channel and whose state mutations sync as Colyseus deltas), then
 * re-checks the turn-end condition. Mirrors the play/digivolve handler shape.
 */
export function handleActivateEffect(engine: GameEngine, seat: Seat, intent: ActivateEffectIntent): IntentResult {
  const deps = activateEffectDeps(engine);
  const check = validateActivateEffect(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: check.reason };
  }
  continueMainVerb(
    engine,
    async () => {
      const outcome = await applyActivateEffect(engine.state, seat, intent, deps);
      // Direct [Main] activations do not pass through a timing-window resolver, so
      // perform the post-effect rule check here (e.g. a stack peel exposing a 0-DP card).
      await engine.ruleProcess();
      return outcome;
    },
    (outcome) => {
      if (outcome.ok) {
        engine.hooks.emit({
          kind: "effectActivated",
          seat,
          sourceCardId: outcome.outcome.sourceCardId,
          effectKey: outcome.outcome.effectKey,
          description: outcome.outcome.description,
        });
        // Tracker was updated by applyActivateEffect; re-derive the activatable set
        // so the UI reflects the consumed use immediately (maxPerTurn exhausted).
        engine.projection.syncActivatableEffects();
        // An ability that paid or gained memory changes what the hand can afford.
        engine.projection.syncHandAffordances();
      }
    },
    (err) => {
      logError("[engine] activateEffect apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "activateEffect",
        reason: err instanceof Error ? err.message : "activate-effect-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the respondCounter verb (subsystem: attack-and-block; §11-3 Counter
 * Timing). Validates synchronously for the immediate IntentResult; on success
 * runs the chosen [Counter] effect (if any) as a continuation, mirroring
 * handleActivateEffect — but unlike a turn-player verb, does NOT run
 * `checkTurnEndAfterVerb` (engine fires mid-attack, for the defending seat; the
 * sibling combat-decision verbs in combatDecisions.ts don't run it either).
 */
export function handleRespondCounter(engine: GameEngine, seat: Seat, intent: RespondCounterIntent): IntentResult {
  // Counter processing must finish before another response can pass or activate in engine window.
  if (engine.counterResolutionInFlight) return { ok: false, reason: "decision-pending" };
  if (intent.sourceInstanceId !== undefined && intent.effectKey?.startsWith("blast-dna-digivolve:") === true) {
    if (!engine.combat.hasOpenCounterWindow) return { ok: false, reason: "wrong-phase" };
    if (engine.combat.counterWindowSeat !== seat) return { ok: false, reason: "not-your-turn" };
    if (engine.combat.counterActivationsRemaining <= 0) return { ok: false, reason: "illegal-target" };
    if (engine.state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
    // Recompute against live zones, names and restrictions before consuming either material.
    const choice = blastDnaCounterChoices(engine, seat).find(
      (entry) => entry.instanceId === intent.sourceInstanceId && entry.effectKey === intent.effectKey,
    );
    if (choice === undefined) return { ok: false, reason: "illegal-target" };
    engine.counterResolutionInFlight = true;
    void engine.primitives
      .dnaDigivolveInto([choice.materialPermanentId], choice.instanceId, {
        payCost: false,
        extraMaterialInstanceIds: [choice.handMaterialInstanceId],
        extraMaterialsOnBottom: choice.extraMaterialsOnBottom,
      })
      .then((result) => {
        if (result === undefined) throw new Error("invalid-evolution");
        engine.combat.resolveCounterActivated(seat);
        engine.hooks.emit({
          kind: "effectActivated",
          seat,
          sourceCardId: result.topCard!.cardId,
          effectKey: choice.effectKey,
          description: choice.description,
        });
      })
      .catch((err) => {
        logError("[engine] Blast DNA Digivolve apply failed:", err);
        engine.hooks.emit({
          kind: "actionRejected",
          intent: "respondCounter",
          reason: err instanceof Error ? err.message : "blast-dna-digivolve-apply-error",
        });
      })
      .finally(() => {
        engine.counterResolutionInFlight = false;
      });
    return { ok: true };
  }
  if (intent.sourceInstanceId !== undefined && intent.effectKey?.startsWith("blast-digivolve:") === true) {
    if (!engine.combat.hasOpenCounterWindow) return { ok: false, reason: "wrong-phase" };
    if (engine.combat.counterWindowSeat !== seat) return { ok: false, reason: "not-your-turn" };
    if (engine.combat.counterActivationsRemaining <= 0) return { ok: false, reason: "illegal-target" };
    const eligible = counterEligibleSources(engine, seat).find(
      (entry) => entry.instanceId === intent.sourceInstanceId && entry.effectKey === intent.effectKey,
    );
    if (eligible === undefined) return { ok: false, reason: "illegal-target" };
    const permanentId = intent.effectKey.slice("blast-digivolve:".length);
    const blastIntent: DigivolveIntent = {
      type: "digivolve",
      permanentId,
      instanceId: intent.sourceInstanceId,
      useBlastDigivolve: true,
    };
    const deps = digivolveDeps(engine);
    engine.counterResolutionInFlight = true;
    void applyDigivolve(engine.state, seat, blastIntent, deps)
      .then((outcome) => {
        if (!outcome.ok) throw new Error(outcome.reason);
        engine.combat.resolveCounterActivated(seat);
        engine.hooks.emit({
          kind: "effectActivated",
          seat,
          sourceCardId: outcome.outcome.newTopCardId,
          effectKey: intent.effectKey!,
          description: eligible.description,
        });
      })
      .catch((err) => {
        logError("[engine] Blast Digivolve apply failed:", err);
        engine.hooks.emit({
          kind: "actionRejected",
          intent: "respondCounter",
          reason: err instanceof Error ? err.message : "blast-digivolve-apply-error",
        });
      })
      .finally(() => {
        engine.counterResolutionInFlight = false;
      });
    return { ok: true };
  }
  const deps = respondCounterDeps(engine);
  const check = validateRespondCounter(seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: check.reason };
  }
  engine.counterResolutionInFlight = true;
  void applyRespondCounter(seat, intent, deps)
    .then((outcome) => {
      if (outcome.ok && !outcome.outcome.pass) {
        engine.hooks.emit({
          kind: "effectActivated",
          seat,
          sourceCardId: outcome.outcome.sourceCardId,
          effectKey: outcome.outcome.effectKey,
          description: outcome.outcome.description,
        });
      }
    })
    .catch((err) => {
      logError("[engine] respondCounter apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "respondCounter",
        reason: err instanceof Error ? err.message : "respond-counter-apply-error",
      });
    })
    .finally(() => {
      engine.counterResolutionInFlight = false;
    });
  return { ok: true };
}

/**
 * List `seat`'s currently-activatable [Counter] effects (§11-3-1), one entry per
 * (source instance, effect) pair. Mirrors `syncActivatableEffects` but scoped to
 * one (defending) seat and `EffectTiming.OnCounterTiming` rather than the turn
 * player and `ACTIVATE_TIMING`. Both battle-area Counter effects and explicit
 * `[Hand][Counter]` effects are eligible. Bound into `CombatController`'s
 * `counterEligible` hook so `runCounterWindow` can skip the round trip when nothing is eligible.
 */
export function counterEligibleSources(
  engine: GameEngine,
  seat: Seat,
): { instanceId: string; effectKey: string; description: string }[] {
  const player = engine.state.players[seat];
  if (player === undefined) return [];
  const entries: { instanceId: string; effectKey: string; description: string }[] = [];
  for (const perm of player.battleArea) {
    const candidates = [perm.topCard, ...perm.stack, ...perm.linked].filter((c): c is CardInstance => c !== undefined);
    for (const instance of candidates) {
      const source = engine.cardSourceOf(instance);
      for (const effect of effectsOf(EffectTiming.OnCounterTiming, source)) {
        const ctx = engine.buildEffectContext(source, {});
        if (canTrigger(effect, ctx, engine.tracker) && canActivate(effect, ctx, engine.tracker)) {
          entries.push({
            instanceId: instance.instanceId,
            effectKey: effect.effectKey,
            description: effect.description,
          });
        }
      }
    }
  }
  for (const instance of player.hand) {
    const source = engine.cardSourceOf(instance);
    for (const effect of effectsOf(EffectTiming.OnCounterTiming, source)) {
      const ctx = engine.buildEffectContext(source, {});
      if (canTrigger(effect, ctx, engine.tracker) && canActivate(effect, ctx, engine.tracker)) {
        entries.push({
          instanceId: instance.instanceId,
          effectKey: effect.effectKey,
          description: effect.description,
        });
      }
    }
  }
  entries.push(...blastDnaCounterChoices(engine, seat));
  const blastDeps = { ...digivolveDeps(engine), blastWindowAllowed: () => true };
  for (const instance of player.hand) {
    if (!hasBlastDigivolveKeyword(instance.cardId)) continue;
    for (const permanent of player.battleArea) {
      const intent: DigivolveIntent = {
        type: "digivolve",
        permanentId: permanent.permanentId,
        instanceId: instance.instanceId,
        useBlastDigivolve: true,
      };
      if (!validateDigivolve(engine.state, seat, intent, blastDeps).ok) continue;
      entries.push({
        instanceId: instance.instanceId,
        effectKey: `blast-digivolve:${permanent.permanentId}`,
        description: "＜Blast Digivolve＞",
      });
    }
  }
  return entries;
}

export function blastDnaCounterChoices(engine: GameEngine, seat: Seat) {
  const deps = dnaDigivolveDeps(engine);
  return blastDnaChoices(engine.state, seat, {
    names: (permanent, definition) => effectiveNames(engine.continuous, permanent, definition.nameEn),
    restricted: (permanent, definition) => deps.materialsRestricted?.(engine.state, [permanent], definition) === true,
  });
}

/**
 * Locate a CardInstance anywhere on the board (a permanent's top card, its
 * digivolution stack, or a linked card), returning the instance and the permanent
 * carrying it (undefined for a loose card not on a permanent). Used by
 * activateEffect to resolve the source of a `[Main]` ability.
 */
export function findInstance(
  engine: GameEngine,
  instanceId: string,
): { instance: CardInstance; permanent: Permanent | undefined } | undefined {
  for (const player of engine.state.players) {
    for (const permanent of player.battleArea) {
      const onPerm = instanceOnPermanent(engine, permanent, instanceId);
      if (onPerm !== undefined) return { instance: onPerm, permanent };
    }
    if (player.breeding !== undefined) {
      const onBreeding = instanceOnPermanent(engine, player.breeding, instanceId);
      if (onBreeding !== undefined) return { instance: onBreeding, permanent: player.breeding };
    }
    // A loose card in hand (no carrying permanent): reachable so a [Hand] activated ability
    // resolves. The activate verb's controller check falls back to the loose card's ownerSeat, so
    // a player can only activate their own hand card. permanent stays undefined (no field anchor).
    const inHand = player.hand.find((c) => c.instanceId === instanceId);
    if (inHand !== undefined) return { instance: inHand, permanent: undefined };
    // A loose card in trash: reachable so a `[Trash][Main]` activated ability resolves
    // (the eighth engine gap's activation-path half — the corresponding regression coverage).
    // permanent stays undefined; the `activated` builder's residency guard (isFromTrash vs.
    // not) is what keeps engine from also making an ordinary on-field-only [Main] ability
    // activatable once its card has been trashed.
    const inTrash = player.trash.find((c) => c.instanceId === instanceId);
    if (inTrash !== undefined) return { instance: inTrash, permanent: undefined };
  }
  return undefined;
}

/**
 * Locate a CardInstance anywhere the continuous-recompute pass reaches (battle area,
 * breeding, hand, trash, face-up security, a mid-resolution Option) — the superset
 * `findInstance` does NOT cover (findInstance is scoped to what `activateEffect` needs:
 * a permanent's own stack/linked cards, or a loose hand/trash card). Used by
 * `fireSubTrigger`'s context builder to bind `ctx.source` for an anchor-less watcher
 * (`SubTriggerInstall.sourceInstanceId`) installed by a hand/trash-resident card.
 */
export function findLooseInstance(engine: GameEngine, instanceId: string): CardInstance | undefined {
  return (
    peekCheckedCard(engine.state, instanceId)?.card ??
    engine.listCandidateInstances().find((c) => c.instanceId === instanceId)
  );
}

export function instanceOnPermanent(
  engine: GameEngine,
  permanent: Permanent,
  instanceId: string,
): CardInstance | undefined {
  if (permanent.topCard !== undefined && permanent.topCard.instanceId === instanceId) {
    return permanent.topCard;
  }
  for (const card of permanent.stack) {
    if (card.instanceId === instanceId) return card;
  }
  for (const card of permanent.linked) {
    if (card.instanceId === instanceId) return card;
  }
  return undefined;
}

/**
 * Route the play-card verb (subsystem: play-card). Validates synchronously to
 * produce the immediate IntentResult the room returns to the client; on success,
 * applies the action. Because applyPlayCard can await player decisions while
 * resolving On Play (or the option activation), it runs as a continuation — its
 * state mutations sync to clients as Colyseus deltas and any prompt arrives on the
 * decision channel, matching the API-CONTRACT "Play a card" flow.
 */
export function handlePlayCard(engine: GameEngine, seat: Seat, intent: PlayCardIntent): IntentResult {
  // A DigiXros declaration (place named materials under the card for a per-material cost
  // reduction) routes to the dedicated DigiXros play subsystem.
  if (intent.digiXros !== undefined) {
    return handleDigiXros(engine, seat, intent as DigiXrosIntent);
  }
  // An Assembly declaration (place the exact named/traited trash-card count under the card for
  // a flat cost reduction, §7-3) routes to the dedicated Assembly play subsystem.
  if (intent.assembly !== undefined) {
    return handleAssembly(engine, seat, intent as AssemblyIntent);
  }
  const deps = playCardDeps(engine);
  const check = validatePlayCard(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapPlayCardReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyPlayCard(engine.state, seat, intent, deps),
    () => {
      if (!engine.memory.hasCrossedToOpponent()) return;
      const played = engine.state.players[seat]?.battleArea.find(
        (permanent) => permanent.topCard?.instanceId === intent.instanceId,
      );
      if (played !== undefined && engine.continuous.hasKeyword(played.permanentId, "Rush")) {
        engine.crossedMemoryRushAttackers.add(played.permanentId);
      }
    },
    (err) => {
      logError("[engine] playCard apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "playCard",
        reason: err instanceof Error ? err.message : "play-card-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route a DigiXros play (subsystem: digiXros). Validates the material/expander declaration
 * synchronously for the immediate IntentResult; on success applies it as a continuation (the
 * placement + On Play can await player decisions), matching the playCard router.
 */
export function handleDigiXros(engine: GameEngine, seat: Seat, intent: DigiXrosIntent): IntentResult {
  const deps = digiXrosDeps(engine);
  const check = validateDigiXros(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapDigiXrosReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyDigiXros(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] digiXros apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "playCard",
        reason: err instanceof Error ? err.message : "digixros-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route an Assembly play (subsystem: assembly; §7-3). Validates the trash-material declaration
 * synchronously for the immediate IntentResult; on success applies it as a continuation (the
 * placement + On Play can await player decisions), matching the digiXros/playCard routers.
 */
export function handleAssembly(engine: GameEngine, seat: Seat, intent: AssemblyIntent): IntentResult {
  const deps = assemblyDeps(engine);
  const check = validateAssembly(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapAssemblyReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyAssembly(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] assembly apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "playCard",
        reason: err instanceof Error ? err.message : "assembly-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the digivolve verb (subsystem: digivolve). Validates synchronously to
 * produce the immediate IntentResult the room returns to the client; on success,
 * applies the action. Because applyDigivolve can await player decisions while
 * resolving When Digivolving, it runs as a continuation — its state mutations sync
 * to clients as Colyseus deltas and any prompt arrives on the decision channel,
 * matching the API-CONTRACT "Digivolve" flow.
 */
export function validateAppFusion(
  engine: GameEngine,
  seat: Seat,
  intent: Extract<Intent, { type: "appFusion" }>,
): AppFusionValidation {
  if (engine.state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  if (engine.state.phase !== Phase.Main) return { ok: false, reason: "wrong-phase" };
  const player = engine.state.players[seat];
  const source = player?.battleArea.find(({ permanentId }) => permanentId === intent.permanentId);
  const result = player?.hand.find(({ instanceId }) => instanceId === intent.instanceId);
  if (source === undefined || source.topCard === undefined || result === undefined) {
    return { ok: false, reason: "illegal-target" };
  }
  const linked = source.linked.find(({ instanceId }) => instanceId === intent.linkedInstanceId);
  if (linked === undefined) return { ok: false, reason: "illegal-target" };
  const topName = lookupDefinition(source.topCard.cardId)?.nameEn;
  const linkedName = lookupDefinition(linked.cardId)?.nameEn;
  const resultDefinition = lookupDefinition(result.cardId);
  const deps = digivolveDeps(engine);
  // App Fusion uses the same resulting stack transition as ordinary digivolution;
  // active base restrictions therefore apply before any cost or zone mutation.
  if (deps.digivolveBaseRestricted?.(engine.state, source, result) === true) {
    return { ok: false, reason: "illegal-target" };
  }
  if (deps.digivolveIntoAllowed?.(engine.state, source, result) === false) {
    return { ok: false, reason: "illegal-target" };
  }
  const printedCost =
    topName === undefined || linkedName === undefined || resultDefinition === undefined
      ? undefined
      : appFusionCostFor(result.cardId, { topName, linkedNames: [linkedName] });
  if (printedCost === undefined || resultDefinition === undefined) return { ok: false, reason: "illegal-target" };
  const passiveCost =
    deps.adjustedDigivolveCost?.(engine.state, source, printedCost, resultDefinition, { consumeOnce: false }) ??
    printedCost;
  const potentialReduction =
    deps.potentialInteractiveDigivolveReduction?.(engine.state, seat, source, resultDefinition) ?? 0;
  const projectedCost = Math.max(0, passiveCost - potentialReduction);
  if (deps.maxAffordable(engine.state, seat) < projectedCost) return { ok: false, reason: "insufficient-memory" };
  return { ok: true, source, result, resultDefinition, linked, printedCost, projectedCost };
}

export function handleAppFusion(
  engine: GameEngine,
  seat: Seat,
  intent: Extract<Intent, { type: "appFusion" }>,
): IntentResult {
  const check = validateAppFusion(engine, seat, intent);
  if (!check.ok) return check;
  const { source, result, resultDefinition, printedCost } = check;
  const originalTopInstanceId = source.topCard!.instanceId;
  const originalLinkedInstanceId = intent.linkedInstanceId;
  const samePublicAppFusionSnapshot = (): boolean => {
    const currentSource = engine.state.players[seat]?.battleArea.find(
      ({ permanentId }) => permanentId === intent.permanentId,
    );
    const currentResult = engine.state.players[seat]?.hand.find(({ instanceId }) => instanceId === intent.instanceId);
    return (
      currentSource === source &&
      currentSource?.controllerSeat === seat &&
      currentSource.topCard?.instanceId === originalTopInstanceId &&
      currentSource.linked.some(({ instanceId }) => instanceId === originalLinkedInstanceId) &&
      currentResult === result
    );
  };
  const deps = digivolveDeps(engine);

  continueMainVerb(
    engine,
    async () => {
      await deps.prepareDigivolveCost?.(engine.state, seat, source, result, resultDefinition);
      if (!samePublicAppFusionSnapshot()) return undefined;
      const adjusted =
        deps.adjustedDigivolveCost?.(engine.state, source, printedCost, resultDefinition, { consumeOnce: true }) ??
        printedCost;
      const interactiveReduction =
        (await deps.activateInteractiveDigivolveReduction?.(
          engine.state,
          seat,
          source,
          resultDefinition,
          result.instanceId,
        )) ?? 0;
      if (!samePublicAppFusionSnapshot()) return undefined;
      const finalCost = Math.max(0, adjusted - interactiveReduction);
      if (deps.maxAffordable(engine.state, seat) < finalCost) return undefined;
      await deps.fireWouldDigivolve?.(engine.state, seat, source, resultDefinition);
      if (!samePublicAppFusionSnapshot()) return undefined;
      return engine.primitives.appFuseInto(intent.permanentId, intent.instanceId, intent.linkedInstanceId, finalCost, {
        publicEntry: true,
      });
    },
    () => {},
    (err) =>
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "appFusion",
        reason: err instanceof Error ? err.message : "app-fusion-apply-error",
      }),
  );
  return { ok: true };
}

export function handleDigivolve(engine: GameEngine, seat: Seat, intent: DigivolveIntent): IntentResult {
  const deps = digivolveDeps(engine);
  const check = validateDigivolve(engine.state, seat, intent, deps, { deferAffordability: true });
  if (!check.ok) {
    return { ok: false, reason: mapDigivolveReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyDigivolve(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] digivolve apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "digivolve",
        reason: err instanceof Error ? err.message : "digivolve-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the linkCard verb (subsystem: link; §6-5-1-4/§10-1 — the hand half only,
 * see actions/link.ts). Validates synchronously to produce the immediate
 * IntentResult the room returns to the client; on success, applies the action as a
 * continuation (the Link primitive can await the `whenLinked` SubTrigger bus),
 * matching the pattern of the other Main-phase verbs above.
 */
export function handleLinkCard(engine: GameEngine, seat: Seat, intent: LinkCardIntent): IntentResult {
  const deps = linkCardDeps(engine);
  const check = validateLinkCard(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapLinkReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyLinkCard(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] linkCard apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "linkCard",
        reason: err instanceof Error ? err.message : "linkCard-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the dnaDigivolve verb (subsystem: dna-digivolve; §8-2 DNA digivolution as a
 * player-declared action — see actions/dnaDigivolve.ts). Validates synchronously to
 * produce the immediate IntentResult the room returns to the client; on success, applies
 * the action as a continuation (the merge primitive draws and fires WhenDigivolving),
 * matching the pattern of the other Main-phase verbs above.
 */
export function handleDnaDigivolve(engine: GameEngine, seat: Seat, intent: DnaDigivolveIntent): IntentResult {
  const deps = dnaDigivolveDeps(engine);
  const check = validateDnaDigivolve(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapDnaDigivolveReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyDnaDigivolve(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] dnaDigivolve apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "dnaDigivolve",
        reason: err instanceof Error ? err.message : "dnaDigivolve-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the hatchEgg verb (subsystem: breeding). Applies the action synchronously
 * (breeding has no cost / draw / awaited effect), and on success closes the open
 * breeding window — the turn player's single breeding action is spent (§6-4-1).
 */
export function handleHatchEgg(engine: GameEngine, seat: Seat, intent: HatchEggIntent): IntentResult {
  void intent;
  if (engine.breeding.isActionSpent) return { ok: false, reason: breedingActionSpentReason(engine) };
  const result = applyHatchEgg(engine.state, seat, breedingDeps(engine));
  if (!result.ok) return { ok: false, reason: mapBreedingReason(result.reason) };
  // "[All Turns] when YOU hatch [a Digi-Egg] in the breeding area" (BT17-093). Fired from
  // engine sync intent handler without awaiting; the breeding window stays open until the
  // fire settles (see handleMoveFromBreeding).
  const fired = engine.fireSubTrigger("whenHatch", { subjectPermanentId: result.outcome.permanentId }).catch((err) => {
    logError("[engine] hatchEgg fire failed:", err);
  });
  engine.breeding.actionTaken(seat, fired);
  return { ok: true };
}

/**
 * Route the moveFromBreeding verb (subsystem: breeding). Applies the action and, on
 * success, closes the open breeding window (the single breeding action is spent).
 */
export function handleMoveFromBreeding(engine: GameEngine, seat: Seat, intent: MoveFromBreedingIntent): IntentResult {
  if (engine.breeding.isActionSpent) return { ok: false, reason: breedingActionSpentReason(engine) };
  const result = applyMoveFromBreeding(engine.state, seat, intent, breedingDeps(engine));
  if (!result.ok) return { ok: false, reason: mapBreedingReason(result.reason) };
  const movedPermanentId = result.outcome.permanentId;
  // The breeding -> battle move fires the OnMove timing, the broad entry timing/bus, then
  // the two movement SubTrigger events below so reactive watchers execute (both fired unconditionally:
  // a watcher's sourceFilter (isSelfRef / controller matching) gates which side reacts):
  //   whenMovedFromBreeding         — "when one of YOUR Digimon moves from breeding" (BT16-082)
  //   whenOpponentMovedFromBreeding — "when your OPPONENT moves a Digimon from breeding" (BT5-044, BT11-087)
  // This handler must return its IntentResult synchronously, so the fires are chained into one
  // promise: sequential internal ordering (each begins only after the previous settles) with a
  // single .catch(logError) so a thrown error surfaces as a log instead of an unhandled rejection.
  // Un-awaited/uncaught fires here previously risked exactly the race P-130's fix eliminated for
  // movePermanentZone: a nested fire clobbering the then-shared engine trigger field out of order
  // (each window now carries its own trigger payload in its environment).
  // The chain is handed to the breeding window, which closes only once it settles: closing it
  // synchronously let the turn machine open Main and fire [Start of Your Main Phase] while
  // BT16-082's move watcher was still resolving.
  const fired = engine
    .fireTiming(EffectTiming.OnMove, { movedPermanentId })
    .then(() =>
      engine.fireTiming(EffectTiming.OnEnterFieldAnyone, {
        subjectPermanentId: movedPermanentId,
        entryCause: "move",
      }),
    )
    .then(() =>
      engine.fireSubTrigger("onEnterFieldAnyone", {
        subjectPermanentId: movedPermanentId,
        entryCause: "move",
      }),
    )
    .then(() => engine.fireSubTrigger("whenMovedFromBreeding", { subjectPermanentId: movedPermanentId }))
    .then(() => engine.fireSubTrigger("whenOpponentMovedFromBreeding", { subjectPermanentId: movedPermanentId }))
    .catch((err) => {
      logError("[engine] moveFromBreeding fire failed:", err);
    });
  engine.breeding.actionTaken(seat, fired);
  return { ok: true };
}

/**
 * The turn's one breeding action is already taken and its triggers are still settling
 * (BT16-082's reveal, BT17-093's hatch watcher). A decision those triggers opened is the
 * more specific refusal, matching the breeding verbs' own validation order.
 */
export function breedingActionSpentReason(engine: GameEngine): RejectReason {
  return engine.state.pendingDecision !== undefined ? "decision-pending" : "wrong-phase";
}

/**
 * Handle an endPhase during the Breeding phase: the turn player chooses to do
 * nothing, closing the breeding window (§6-4-1-3). Rejected when it is not engine
 * seat's open breeding window.
 */
export function handleBreedingSkip(engine: GameEngine, seat: Seat): IntentResult {
  if (engine.state.gameOver) return { ok: false, reason: "illegal-target" };
  if (engine.state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (engine.state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  return engine.breeding.skip(seat) ? { ok: true } : { ok: false, reason: "wrong-phase" };
}

/**
 * Whether `seat` has at least one legal Main-phase action right now: a playable
 * card, a digivolve option, a DNA digivolution, a link declaration, an available
 * attack, or an activatable [Main] effect. Returns as soon as any action is found
 * possible (short-circuit). Used to auto-end the turn when the player has nothing
 * left to do.
 *
 * Effect and link availability is read from the projections `syncActivatableEffects`
 * and `syncLinkTargets` publish for the client, recomputed here so the gate and the
 * affordances the player sees can never disagree about what is legal.
 */
export function hasAnyMainPhaseAction(engine: GameEngine, seat: Seat): boolean {
  const player = engine.state.players[seat];
  if (!player) return false;

  // 1. Activatable [Main] effects on every zone the projection covers: battle area,
  //    breeding, hand ([Hand][Main]) and trash ([Trash][Main]).
  engine.projection.syncActivatableEffects();
  const effectPermanents = [...player.battleArea];
  if (player.breeding !== undefined) effectPermanents.push(player.breeding);
  for (const perm of effectPermanents) {
    if (perm.activatableEffectsJson) return true;
  }
  for (const instance of [...player.hand, ...player.trash]) {
    if (instance.activatableEffectsJson) return true;
  }

  // 1b. Declare a link (§6-5-1-4) from hand or from a battle-area top card.
  engine.projection.syncLinkTargets();
  for (const instance of player.hand) {
    if (instance.linkTargetPermanentIds.length > 0) return true;
  }
  for (const perm of player.battleArea) {
    if (perm.topCard !== undefined && perm.topCard.linkTargetPermanentIds.length > 0) return true;
  }

  // 2. Play a card from hand. The plain validation prices the card at its printed cost, so a
  //    DigiXros / Assembly card whose declaration would lower the cost into range must read as
  //    an available action through the same material-route escape the hand affordances use
  //    (§7-2 / §7-3) — otherwise the turn auto-ends on a player who can still play it.
  const playDeps = playCardDeps(engine);
  for (const card of player.hand) {
    const def = lookupDefinition(card.cardId);
    if (!def || def.kinds.includes(CardKind.DigiEgg)) continue;
    const check = validatePlayCard(engine.state, seat, { type: "playCard", instanceId: card.instanceId }, playDeps);
    if (playableFromHand(check, card.cardId)) return true;
  }

  // 3. App Fusion from hand using an explicitly linked physical material.
  for (const card of player.hand) {
    const def = lookupDefinition(card.cardId);
    if (!def?.kinds.includes(CardKind.Digimon)) continue;
    for (const perm of player.battleArea) {
      for (const linked of perm.linked) {
        const check = validateAppFusion(engine, seat, {
          type: "appFusion",
          permanentId: perm.permanentId,
          instanceId: card.instanceId,
          linkedInstanceId: linked.instanceId,
        });
        if (check.ok) return true;
      }
    }
  }

  // 4. Digivolve a hand Digimon onto a battle-area or breeding permanent
  const digiDeps = digivolveDeps(engine);
  for (const card of player.hand) {
    const def = lookupDefinition(card.cardId);
    if (!def?.kinds.includes(CardKind.Digimon)) continue;
    const targets = [...player.battleArea];
    if (player.breeding) targets.push(player.breeding);
    for (const perm of targets) {
      const check = validateDigivolve(
        engine.state,
        seat,
        {
          type: "digivolve",
          permanentId: perm.permanentId,
          instanceId: card.instanceId,
        },
        digiDeps,
      );
      if (check.ok) return true;
    }
  }

  // 5. DNA digivolve (§8-2): a printed DNA requirement names two materials, so the
  //    single-base `validateDigivolve` probe above always rejects it.
  if (player.battleArea.length >= 2) {
    const dnaDeps = dnaDigivolveDeps(engine);
    for (const card of player.hand) {
      const def = lookupDefinition(card.cardId);
      if (!def?.kinds.includes(CardKind.Digimon)) continue;
      for (let first = 0; first < player.battleArea.length; first++) {
        for (let second = first + 1; second < player.battleArea.length; second++) {
          const materialPermanentIds = [player.battleArea[first]!.permanentId, player.battleArea[second]!.permanentId];
          const check = validateDnaDigivolve(
            engine.state,
            seat,
            { type: "dnaDigivolve", materialPermanentIds, instanceId: card.instanceId },
            dnaDeps,
          );
          if (check.ok) return true;
        }
      }
    }
  }

  // 6. Attack with an unsuspended Digimon
  const deps = attackDeps(engine);
  const oppPlayer = engine.state.players[1 - seat];
  for (const perm of player.battleArea) {
    const intent: AttackIntent = { attackerPermanentId: perm.permanentId, target: { kind: "player" } };
    if (validateAttack(deps, seat, intent) === null) return true;
    if (oppPlayer) {
      for (const oppPerm of oppPlayer.battleArea) {
        if (!oppPerm.isSuspended) continue;
        const permIntent: AttackIntent = {
          attackerPermanentId: perm.permanentId,
          target: { kind: "permanent", permanentId: oppPerm.permanentId },
        };
        if (validateAttack(deps, seat, permIntent) === null) return true;
      }
    }
  }

  return false;
}
