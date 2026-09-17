import type { EffectContext } from "../../EffectContext.js";
import { candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import type { Cost } from "@aegis/shared";

/**
 * Pay memory.
 */
export async function payMemoryCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  // "By paying N cost" — pay N memory (memory can go negative; the gauge handles
  // turn-passing). A free effect would not carry this cost at all.
  const n = cost.memory ?? 0;
  if (n <= 0) return true;
  ctx.fx.gainMemory(-n);
  return true;
}

/**
 * Pay by revealing cards.
 */
export async function payRevealCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  if (cost.target === undefined) return false;
  const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
  const count = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
  if (count <= 0 || candidates.length < count) return false;
  const chosen = await pickLoose(ctx, { ...cost.target, count }, candidates);
  if (chosen.length !== count) return false;
  // A reveal cost is a public hand reveal, and the exact cards paid by that cost
  // remain available to a following "that revealed card" disposition (EX4-023).
  // Keep the binding on the effect context instead of resolving the follow-up target
  // independently, which could choose a different same-level hand card.
  ctx.lastRevealedCards = chosen.flatMap((instanceId) => {
    const card = candidates.find((candidate) => candidate.instanceId === instanceId);
    if (card === undefined) return [];
    ctx.fx.revealCard(card.ownerSeat, card.cardId, ctx.source.cardId);
    return [{ instanceId: card.instanceId, cardId: card.cardId, ownerSeat: card.ownerSeat }];
  });
  return true;
}
