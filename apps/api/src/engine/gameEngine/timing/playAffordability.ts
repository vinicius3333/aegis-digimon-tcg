import { CardKind, EffectTiming, type CardInstance } from "@aegis/shared";
import type { GameEngine } from "../../GameEngine.js";
import { effectsOf } from "../../effects/collect.js";
import { canPayCost } from "../../effects/interpreter/costs.js";
import {
  potentialWouldBePlayedSelfReduction,
  wouldBePlayedSelfReducersFor,
} from "../../effects/interpreter/registration/reducers.js";
import { buildEffectContext, cardSourceOf } from "../effectContext.js";
import { crossPermanentPlayReducerWatchers, pendingPlayTarget, residentPlayCostEffects } from "./playReducers.js";

/**
 * Prove impossibility without paying a cost or suppressing an unknown reduction route.
 * Covers an isolated self reducer or certified fixed replacement bodies. Other
 * pay-time effects can change resources or memory and retain authoritative resolution.
 */
export function minimumDeferredPlayCost(
  engine: GameEngine,
  instance: CardInstance,
  baseCost: number,
): number | undefined {
  const source = cardSourceOf(engine, instance);
  const seat = source.ownerSeat;
  if (engine.continuous.blocksCostReduction(seat, "play")) return baseCost;
  const breeding = engine.state.players[seat]?.breeding;
  const breedingEffects = [breeding?.topCard, ...Array.from(breeding?.stack ?? [])].some(
    (card, index) =>
      card !== undefined &&
      effectsOf(EffectTiming.BeforePayCost, cardSourceOf(engine, card)).some(
        (effect) => effect.costWindow === undefined && (index === 0 || effect.isInherited),
      ),
  );
  if (breedingEffects || crossPermanentPlayReducerWatchers(engine, instance, seat).length > 0) return undefined;
  const residentEffects = residentPlayCostEffects(engine, seat);
  const reducers = wouldBePlayedSelfReducersFor(instance.cardId);
  const directEffects = effectsOf(EffectTiming.BeforePayCost, source).filter(
    (effect) => effect.costWindow !== "digivolve",
  );
  const trigger = {
    wouldBePlayedInstanceId: instance.instanceId,
    wouldBePlayedCardId: instance.cardId,
    wouldBePlayedAsOption: source.definition.kinds.includes(CardKind.Option),
  };
  const ctx = {
    ...buildEffectContext(engine, source, trigger),
    selections: new Map<string, string>(),
  };
  const inertEffects =
    directEffects.every((effect) => effect.canAttemptPlayCostReduction?.(ctx) === false) &&
    residentEffects.every(
      ({ effect, source: residentSource }) =>
        effect.canAttemptPlayCostReduction?.({
          ...buildEffectContext(engine, residentSource, trigger),
          selections: new Map<string, string>(),
        }) === false,
    );
  const turnBudget = {
    hasFired: (key: string) => engine.tracker.count(key, "replacement") > 0,
    markFired: () => {},
  };
  // Compiled resident clauses may install their subscription only during payment.
  // Include their certified result before that installation, without resolving them.
  const prospective = residentEffects.filter(({ effect }) => effect.playReductionBound !== undefined);
  const hasSubscriptions =
    engine.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", seat) ||
    engine.subTriggers.hasPassiveReductionsFor("wouldBePlayed");
  const applicableSubscriptions =
    hasSubscriptions &&
    engine.subTriggers.hasApplicablePlayReductions(
      seat,
      pendingPlayTarget(instance, source),
      source.definition,
      turnBudget,
      "hand",
    );
  if (prospective.length > 0 || applicableSubscriptions) {
    // No other pay-time body may change memory, install reducers or alter payment resources.
    if (
      directEffects.length > 0 ||
      reducers.length > 0 ||
      residentEffects.some(
        ({ effect, source: residentSource }) =>
          effect.playReductionBound === undefined &&
          effect.canAttemptPlayCostReduction?.({
            ...buildEffectContext(engine, residentSource, trigger),
            selections: new Map<string, string>(),
          }) !== false,
      )
    )
      return undefined;
    const bounds = engine.subTriggers.fixedPlayReductionBounds(seat, turnBudget);
    if (bounds === undefined) return undefined;
    for (const { effect, source: residentSource } of prospective) {
      const bound = effect.playReductionBound!;
      // A no-payment registration may already exist; counting it twice is a safe
      // overestimate. Source returns are grouped by physical card below.
      bounds.push({
        ...bound,
        sourceInstanceId: residentSource.instanceId,
        sourcePermanentId: residentSource.permanent()?.permanentId,
      });
    }
    let maximum = 0;
    const returnedSources = new Map<string, number>();
    for (const bound of bounds) {
      if (!bound.returnsSourceToDeck) {
        maximum += Math.max(0, bound.maximumReduction);
        continue;
      }
      // A hand-armed subscription can later acquire a resident home. Find that
      // same physical card, rather than trusting its install-time anchor.
      const permanent = engine.state.players[seat]?.battleArea.find(
        (unit) => unit.topCard?.instanceId === bound.sourceInstanceId,
      );
      if (
        permanent?.topCard === undefined ||
        permanent.controllerSeat !== seat ||
        permanent.topCard.ownerSeat !== seat ||
        permanent.inBreeding ||
        permanent.stack.length > 0 ||
        permanent.linked.length > 0 ||
        !cardSourceOf(engine, permanent.topCard).definition.kinds.includes(CardKind.Tamer) ||
        engine.continuous.hasRestriction(permanent.permanentId, "beReturned") ||
        engine.continuous.hasRestriction(permanent.permanentId, "leaveBattleAreaExceptByDeletion") ||
        engine.subTriggers.replacementsFor("wouldLeavePlay").length > 0 ||
        engine.subTriggers.subscriptionsFor("wouldBeReturned").length > 0
      )
        return undefined;
      // The source leaves on its first successful return. A duplicate installation
      // cannot pay with it again; independent clauses can choose the largest discount.
      returnedSources.set(
        permanent.topCard.instanceId,
        Math.max(returnedSources.get(permanent.topCard.instanceId) ?? 0, bound.maximumReduction),
      );
    }
    // A second source's pre-return recompute may arm a previously absent conditional
    // reducer after the first source leaves. That route remains unknown.
    if (returnedSources.size > 1) return undefined;
    for (const reduction of returnedSources.values()) maximum += reduction;
    return Math.max(0, baseCost - maximum);
  }
  if (hasSubscriptions) {
    const stableReducers = reducers.every(
      (reducer) =>
        reducer.pay === undefined &&
        reducer.costActions === undefined &&
        reducer.amountPerPaid === undefined &&
        (reducer.cost === undefined || (reducer.cost.kind === "suspend" && !canPayCost(ctx, reducer.cost))),
    );
    if (!inertEffects || !stableReducers) return undefined;
  }
  if (residentEffects.length > 0) {
    // Every pay-time body must be an isolated sacrifice with no candidate. If any
    // body can change the board, another currently empty payment may become valid.
    return reducers.length === 0 && inertEffects ? baseCost : undefined;
  }
  if (directEffects.length > 0) {
    // A sole sacrifice reducer with no target cannot change resources or grant a discount.
    // Other effects and any available target retain authoritative payment resolution.
    return directEffects.length === 1 &&
      reducers.length === 0 &&
      directEffects[0]!.canAttemptPlayCostReduction?.(ctx) === false
      ? baseCost
      : undefined;
  }
  if (reducers.length === 0) return baseCost;
  if (reducers.length !== 1) return undefined;
  const reducer = reducers[0]!;
  if (reducer.pay !== undefined || reducer.costActions !== undefined || reducer.amountPerPaid !== undefined)
    return undefined;
  if (reducer.cost !== undefined) {
    // Only this fixed-count cost is independent of memory and zone-changing payments.
    if (reducer.cost.kind !== "suspend") return undefined;
    return Math.max(0, baseCost - (canPayCost(ctx, reducer.cost) ? Math.max(0, reducer.amount) : 0));
  }
  return Math.max(0, baseCost - potentialWouldBePlayedSelfReduction(ctx, reducer));
}
