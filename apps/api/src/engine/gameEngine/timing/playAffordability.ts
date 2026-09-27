import { CardKind, EffectTiming, type CardInstance } from "@aegis/shared";
import type { GameEngine } from "../../GameEngine.js";
import { effectsOf } from "../../effects/collect.js";
import { canPayCost } from "../../effects/interpreter/costs.js";
import {
  potentialWouldBePlayedSelfReduction,
  wouldBePlayedSelfReducersFor,
} from "../../effects/interpreter/registration/reducers.js";
import { buildEffectContext, cardSourceOf } from "../effectContext.js";
import { crossPermanentPlayReducerWatchers, residentPlayCostEffects } from "./playReducers.js";

/**
 * Prove impossibility without paying a cost or suppressing an unknown reduction route.
 * This bound covers a single self reducer. Other pay-time effects can change its
 * payment resources or memory, so those continue through authoritative resolution.
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
        (effect) => index === 0 || effect.isInherited,
      ),
  );
  if (
    effectsOf(EffectTiming.BeforePayCost, source).some((effect) => effect.costWindow !== "digivolve") ||
    breedingEffects ||
    crossPermanentPlayReducerWatchers(engine, instance, seat).length > 0 ||
    residentPlayCostEffects(engine, seat).length > 0 ||
    engine.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", seat) ||
    engine.subTriggers.hasPassiveReductionsFor("wouldBePlayed")
  )
    return undefined;
  const reducers = wouldBePlayedSelfReducersFor(instance.cardId);
  if (reducers.length === 0) return baseCost;
  if (reducers.length !== 1) return undefined;
  const reducer = reducers[0]!;
  if (reducer.pay !== undefined || reducer.costActions !== undefined || reducer.amountPerPaid !== undefined)
    return undefined;
  const ctx = {
    ...buildEffectContext(engine, source, {
      wouldBePlayedInstanceId: instance.instanceId,
      wouldBePlayedCardId: instance.cardId,
      wouldBePlayedAsOption: source.definition.kinds.includes(CardKind.Option),
    }),
    selections: new Map<string, string>(),
  };
  if (reducer.cost !== undefined) {
    // Only this fixed-count cost is independent of memory and zone-changing payments.
    if (reducer.cost.kind !== "suspend") return undefined;
    return Math.max(0, baseCost - (canPayCost(ctx, reducer.cost) ? Math.max(0, reducer.amount) : 0));
  }
  return Math.max(0, baseCost - potentialWouldBePlayedSelfReduction(ctx, reducer));
}
