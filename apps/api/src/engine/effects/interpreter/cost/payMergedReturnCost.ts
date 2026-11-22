import type { EffectContext } from "../../EffectContext.js";
import { mergedReturnCandidates, type ReturnCandidate } from "./mergedReturnCandidates.js";
import { payCost } from "./pay.js";
import type { Cost } from "@aegis/shared";

const MERGED_SELECTION_REF = "mergedReturnCostPick";

export function payMergedReturnCost(
  ctx: EffectContext,
  costs: readonly Cost[],
  out?: { paidCount: number },
): Promise<boolean> | undefined {
  if (costs.length < 2 && ctx.costIsTheQuestion !== true) return undefined;
  const candidates = mergedReturnCandidates(ctx, costs);
  return candidates === undefined ? undefined : payPickedReturnCost(ctx, candidates, out);
}

async function payPickedReturnCost(
  ctx: EffectContext,
  candidates: readonly ReturnCandidate[],
  out?: { paidCount: number },
): Promise<boolean> {
  if (candidates.length === 0) return false;
  ctx.payingCostDepth = (ctx.payingCostDepth ?? 0) + 1;
  const outerPayingDeclinableCost = ctx.payingDeclinableCost;
  ctx.payingDeclinableCost = true;
  let picked: string | undefined;
  try {
    [picked] = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((candidate) => candidate.pickId),
      visibleCards: candidates.map(({ pickId, cardId }) => ({ instanceId: pickId, cardId })),
      min: 0,
      max: 1,
    });
  } finally {
    ctx.payingCostDepth -= 1;
    ctx.payingDeclinableCost = outerPayingDeclinableCost;
  }
  const chosen = candidates.find((candidate) => candidate.pickId === picked);
  if (chosen === undefined) return false;
  const selections = (ctx.selections ??= new Map());
  const outerBinding = selections.get(MERGED_SELECTION_REF);
  selections.set(MERGED_SELECTION_REF, chosen.boundId);
  try {
    return await payCost(
      ctx,
      { ...chosen.cost, target: { ...chosen.cost.target!, fromSelectionRef: MERGED_SELECTION_REF } },
      out,
    );
  } finally {
    if (outerBinding === undefined) selections.delete(MERGED_SELECTION_REF);
    else selections.set(MERGED_SELECTION_REF, outerBinding);
  }
}
