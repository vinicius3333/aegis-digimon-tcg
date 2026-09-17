import { EffectTiming, Permanent, type CardInstance, type ZoneRef } from "@aegis/shared";
import { setTopCard } from "../../state/access.js";
import { canActivate, canTrigger } from "../../effects/kernel.js";
import { effectsOf } from "../../effects/collect.js";
import {
  applyWouldBePlayedSelfReducer,
  potentialWouldBePlayedSelfReduction,
  wouldBePlayedSelfReducersFor,
} from "../../effects/interpreter.js";
import type { EffectContext } from "../../effects/EffectContext.js";
import { findInstance } from "../intents.js";
import type { GameEngine } from "../../GameEngine.js";
import { buildEffectContext, cardSourceOf } from "../effectContext.js";
import {
  crossPermanentPlayReducerWatchers,
  residentPlayCostEffects,
  runCrossPermanentPlayReducers,
} from "./playReducers.js";

/**
 * The pay-time interactive cost-reduction hook (subsystem: play-card / effect-framework). Fired
 * by the play action for the card being played WHILE IT IS STILL IN HAND, before memory is paid:
 * collect the played instance's `BeforePayCost` effects, resolve each through a single shared
 * EffectContext (so a `ReducePlayCost` action can run its OPTIONAL server-side payment — trash a
 * card / sacrifice a Digimon — and accumulate the earned delta on `ctx.playCostDelta`), then
 * return the FINAL cost floored at 0 (EX9-043 / BT25-076). The reduction is computed entirely
 * server-side — the client never supplies the delta (T-08-26 / T-08-27).
 *
 * This does NOT route through `runTiming`: that resolver narrates a triggered-effect stack and
 * cannot return a per-resolution value. The cost delta is a synchronous-within-await output of
 * the played card's own effects, so it is run directly against a focused context (mirroring the
 * `recomputeContinuousEffects` per-instance `resolve` loop), keeping the value observable.
 */
export async function fireBeforePayCost(
  engine: GameEngine,
  instance: CardInstance,
  baseCost: number,
  useAsOption = false,
  originZone?: ZoneRef,
  projectOnly = false,
): Promise<number> {
  const source = cardSourceOf(engine, instance);
  const reductionBlocked = engine.continuous.blocksCostReduction(source.ownerSeat, "play");
  // A prohibition prevents the reducer from activating, including its optional
  // processing cost (ST12-03 Q755). Projection stays read-only; an unaffordable
  // blocked play cannot start paying side-effect costs. Free plays enter engine
  // window with a zero base (Q4784).
  if (reductionBlocked && (projectOnly || engine.memory.maxCostFor(source.ownerSeat) < baseCost)) return baseCost;
  const effects = effectsOf(EffectTiming.BeforePayCost, source).filter((effect) => effect.costWindow !== "digivolve");
  // Self-targeted "when engine card would be played, [by cost / gated by condition], reduce by N"
  // reducers (EX8-074, BT17-068, BT12-112, BT8-043, BT9-097, ...): the runtime record compiled these as
  // inert `wouldBePlayed reduceCost` replacements (never consulted; `ReplacementSubscription.apply`
  // has no call site and self-reducers on a card still in hand never reach a Static continuous
  // recompute anyway). Run them here in the pay-time window alongside the BeforePayCost effects.
  const selfReducers = wouldBePlayedSelfReducersFor(instance.cardId);
  // Cross-permanent reducers: a permanent OTHER than the played card (BT10-093 / EX3-040)
  // that reduces the cost of a matching played card. Scanned so the early-return below does not
  // skip the pay-time window when only such a reducer applies.
  const crossWatchers = crossPermanentPlayReducerWatchers(engine, instance, source.ownerSeat);
  const residentEffects = residentPlayCostEffects(engine, source.ownerSeat);
  const breeding = engine.state.players[source.ownerSeat]?.breeding;
  const breedingResidentEffects = [breeding?.topCard, ...Array.from(breeding?.stack ?? [])].flatMap((card, index) => {
    if (card === undefined) return [];
    const residentSource = cardSourceOf(engine, card);
    return effectsOf(EffectTiming.BeforePayCost, residentSource)
      .filter((effect) => index === 0 || effect.isInherited)
      .map((effect) => ({ effect, source: residentSource }));
  });
  if (
    effects.length === 0 &&
    selfReducers.length === 0 &&
    crossWatchers.length === 0 &&
    residentEffects.length === 0 &&
    breedingResidentEffects.length === 0 &&
    !engine.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", source.ownerSeat)
  )
    return baseCost;
  // Seed `selections` so the interpreter's runEffect does NOT clone the context (it clones only
  // when `selections` is unset). The ReducePlayCost action writes the earned delta onto THIS
  // context's `playCostDelta`; a clone would strand the write and the reduction would be lost.
  const ctx: EffectContext = {
    ...buildEffectContext(engine, source, {
      wouldBePlayedInstanceId: instance.instanceId,
      wouldBePlayedCardId: instance.cardId,
      wouldBePlayedAsOption: useAsOption,
    }),
    selections: new Map(),
  };
  const playTarget = new Permanent();
  playTarget.permanentId = `pending-play-${instance.instanceId}`;
  playTarget.controllerSeat = source.ownerSeat;
  setTopCard(playTarget, instance);
  playTarget.inBreeding = false;
  playTarget.baseDP = source.definition.dp ?? 0;
  playTarget.currentDP = playTarget.baseDP;
  if (projectOnly) {
    const selfReduction = selfReducers.reduce(
      (total, reducer) => total + potentialWouldBePlayedSelfReduction(ctx, reducer),
      0,
    );
    const interactiveReduction = engine.subTriggers.potentialInteractiveReductionFor(
      "wouldBePlayed",
      source.ownerSeat,
      playTarget,
      source.definition,
      {
        hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
        markFired: (key) => engine.tracker.register(key, "replacement"),
      },
      originZone,
    );
    const turnBudget = {
      hasFired: (key: string) => engine.tracker.count(key, "replacement") > 0,
      markFired: (key: string) => engine.tracker.register(key, "replacement"),
    };
    const prospectiveBreedingReduction = breedingResidentEffects.reduce((total, { effect, source: residentSource }) => {
      if (effect.potentialPlayCostReduction === undefined) return total;
      if (
        effect.maxPerTurn > 0 &&
        engine.tracker.count(`${residentSource.instanceId}/${effect.effectKey}`, "replacement") > 0
      )
        return total;
      if (
        engine.subTriggers.hasInteractiveReductionForSource(
          "wouldBePlayed",
          source.ownerSeat,
          residentSource.instanceId,
          effect.effectKey,
          turnBudget,
        )
      )
        return total;
      const residentCtx: EffectContext = {
        ...buildEffectContext(engine, residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
      };
      if (!canTrigger(effect, residentCtx, engine.tracker) || !canActivate(effect, residentCtx, engine.tracker))
        return total;
      return total + effect.potentialPlayCostReduction(residentCtx, playTarget);
    }, 0);
    return Math.max(0, baseCost - selfReduction - interactiveReduction - prospectiveBreedingReduction);
  }
  // Everything below actually PAYS the reducers' costs. Mark the window so a cost deletion's
  // [On Deletion] joins engine play's trigger batch instead of resolving in its own window.
  const wasPayingPlayCost = engine.payingPlayCost;
  engine.payingPlayCost = true;
  try {
    for (const effect of effects) {
      if (reductionBlocked && effect.isPlayCostReduction === true) continue;
      if (!canTrigger(effect, ctx, engine.tracker)) continue;
      if (!canActivate(effect, ctx, engine.tracker)) continue;
      await effect.resolve(ctx);
    }
    // Generic battle-area pay-time watchers. Unlike the card being played, their
    // EffectContext source is the physical resident carrying the effect; the imminent
    // card identity is carried in TriggerInfo. This lets independent copies resolve and
    // account OPT separately while accumulating their reductions in the shared cost window.
    for (const { effect, source: residentSource } of residentEffects) {
      if (reductionBlocked && effect.isPlayCostReduction === true) continue;
      const residentCtx: EffectContext = {
        ...buildEffectContext(engine, residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
        playCostDelta: ctx.playCostDelta,
      };
      if (!canTrigger(effect, residentCtx, engine.tracker)) continue;
      if (!canActivate(effect, residentCtx, engine.tracker)) continue;
      const beforeDelta = residentCtx.playCostDelta ?? 0;
      await effect.resolve(residentCtx);
      ctx.playCostDelta = residentCtx.playCostDelta;
      if ((residentCtx.playCostDelta ?? 0) > beforeDelta && effect.maxPerTurn > 0) {
        engine.tracker.register(residentSource.instanceId, effect.effectKey);
      }
    }
    // [Breeding] inherited pay-time effects are supplied by cards in the owner's
    // breeding-area stack (the card being played is still in hand, so its own
    // module cannot host the watcher). Resolve these against the same shared
    // play-cost context so their reductions are paid before memory is charged.
    for (const { effect, source: residentSource } of breedingResidentEffects) {
      if (reductionBlocked && effect.isPlayCostReduction === true) continue;
      const residentCtx: EffectContext = {
        ...buildEffectContext(engine, residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
        playCostDelta: ctx.playCostDelta,
      };
      if (!canTrigger(effect, residentCtx, engine.tracker)) continue;
      if (!canActivate(effect, residentCtx, engine.tracker)) continue;
      const beforeDelta = residentCtx.playCostDelta ?? 0;
      await effect.resolve(residentCtx);
      ctx.playCostDelta = residentCtx.playCostDelta;
      if ((residentCtx.playCostDelta ?? 0) > beforeDelta && effect.maxPerTurn > 0) {
        engine.tracker.register(residentSource.instanceId, effect.effectKey);
      }
    }
    // Resolve interactive would-be-played subscriptions only after resident effects have run:
    // inherited [Breeding] reducers live in the breeding stack and install their subscription
    // during engine very pay-time pass, so consulting earlier would miss the current play entirely.
    const interactiveReduction = reductionBlocked
      ? 0
      : await engine.subTriggers.activateInteractiveReductionsFor(
          "wouldBePlayed",
          source.ownerSeat,
          playTarget,
          source.definition,
          undefined,
          (sourcePermanentId, sourceInstanceId) => {
            const resident =
              engine.access.permanentById(sourcePermanentId) ??
              (engine.state.players[source.ownerSeat]?.breeding?.permanentId === sourcePermanentId
                ? engine.state.players[source.ownerSeat]?.breeding
                : undefined);
            return resident?.topCard === undefined
              ? undefined
              : buildEffectContext(
                  engine,
                  cardSourceOf(engine, findInstance(engine, sourceInstanceId ?? "")?.instance ?? resident.topCard),
                  {
                    wouldBePlayedInstanceId: instance.instanceId,
                    wouldBePlayedCardId: instance.cardId,
                    wouldBePlayedAsOption: useAsOption,
                  },
                );
          },
          {
            hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
            markFired: (key) => engine.tracker.register(key, "replacement"),
          },
          undefined,
          originZone,
        );
    if (interactiveReduction > 0) ctx.playCostDelta = (ctx.playCostDelta ?? 0) + interactiveReduction;
    const passiveReduction = engine.continuous.blocksCostReduction(source.ownerSeat, "play")
      ? 0
      : engine.subTriggers.costReductionFor("wouldBePlayed", playTarget, source.definition, {
          consume: true,
          hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
          markFired: (key) => engine.tracker.register(key, "replacement"),
        });
    if (passiveReduction > 0) ctx.playCostDelta = (ctx.playCostDelta ?? 0) + passiveReduction;
    // A prohibition nullifies the reduction, not the played card's own "by <cost>, reduce" clause:
    // its cost may still be paid (KB Q4443 — under Psychemon the 2 Digimon are suspended and the
    // original cost is paid), and the delta it earns is discarded below. A cost-less reducer has
    // nothing to offer while blocked.
    for (const reducer of selfReducers) {
      const paysSomething =
        reducer.cost !== undefined || reducer.pay !== undefined || reducer.costActions !== undefined;
      if (reductionBlocked && !paysSomething) continue;
      await applyWouldBePlayedSelfReducer(ctx, reducer);
    }
    // A self-reducer's cost body may have selected a permanent (BT12-112's chosen [Shoutmon]) to
    // relocate under the played card's own permanent — which does not exist yet at engine point. Stash
    // it for `placePendingDigivolution` to relocate once it does (see `pendingSelfReducerRelocations`).
    if (ctx.pendingSelfReducerRelocations && ctx.pendingSelfReducerRelocations.length > 0) {
      const pending = engine.pendingSelfReducerRelocations.get(instance.instanceId) ?? [];
      engine.pendingSelfReducerRelocations.set(instance.instanceId, [...pending, ...ctx.pendingSelfReducerRelocations]);
    }
    if (ctx.pendingSelfReducerPlacements && ctx.pendingSelfReducerPlacements.length > 0) {
      const pending = engine.pendingPlayReducerPlacements.get(instance.instanceId) ?? [];
      engine.pendingPlayReducerPlacements.set(instance.instanceId, [...pending, ...ctx.pendingSelfReducerPlacements]);
    }
    if (!reductionBlocked) await runCrossPermanentPlayReducers(engine, instance, ctx, crossWatchers);
    if (engine.continuous.blocksCostReduction(source.ownerSeat, "play")) return baseCost;
    const delta = Math.max(0, ctx.playCostDelta ?? 0);
    return Math.max(0, baseCost - delta);
  } finally {
    engine.payingPlayCost = wasPayingPlayCost;
  }
}

/** Resolve the in-hand half of BeforePayCost for an imminent digivolution. */
export async function fireBeforeDigivolveCost(
  engine: GameEngine,
  instance: CardInstance,
  target: Permanent,
): Promise<void> {
  const source = cardSourceOf(engine, instance);
  const effects = effectsOf(EffectTiming.BeforePayCost, source).filter((effect) => effect.costWindow === "digivolve");
  if (effects.length === 0) return;
  const ctx: EffectContext = {
    ...buildEffectContext(engine, source, { subjectPermanentId: target.permanentId }),
    selections: new Map(),
  };
  for (const effect of effects) {
    if (!canTrigger(effect, ctx, engine.tracker)) continue;
    if (!canActivate(effect, ctx, engine.tracker)) continue;
    await effect.resolve(ctx);
  }
}
