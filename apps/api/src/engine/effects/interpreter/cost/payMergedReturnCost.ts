import type { EffectContext } from "../../EffectContext.js";
import { candidateLooseInstances } from "../targeting/loose.js";
import { candidatePermanents } from "../targeting/permanents.js";
import { payCost } from "./pay.js";
import type { Cost } from "@aegis/shared";

type ReturnCandidate = { pickId: string; boundId: string; cardId: string; cost: Cost };

const MERGED_SELECTION_REF = "mergedReturnCostPick";

function isSingleCardReturn(cost: Cost): boolean {
  const target = cost.target;
  return (
    cost.kind === "return" &&
    target !== undefined &&
    target.count === 1 &&
    target.upTo !== true &&
    target.fromSelectionRef === undefined &&
    (target.filter.zone === undefined ||
      target.filter.zone === "battleArea" ||
      target.filter.zone === "digivolutionCards")
  );
}

function returnCandidates(ctx: EffectContext, cost: Cost): ReturnCandidate[] {
  const target = cost.target!;
  if (target.filter.zone === "digivolutionCards") {
    return candidateLooseInstances(ctx, target, ["digivolutionCards"]).map((candidate) => ({
      pickId: candidate.instanceId,
      boundId: candidate.instanceId,
      cardId: candidate.cardId,
      cost,
    }));
  }
  return candidatePermanents(ctx, target).flatMap((permanent) =>
    permanent.topCard === undefined
      ? []
      : [
          {
            pickId: permanent.topCard.instanceId,
            boundId: permanent.permanentId,
            cardId: permanent.topCard.cardId,
            cost,
          },
        ],
  );
}

export function payMergedReturnCost(
  ctx: EffectContext,
  costs: readonly Cost[],
  out?: { paidCount: number },
): Promise<boolean> | undefined {
  if (costs.length < 2 || !costs.every(isSingleCardReturn)) return undefined;
  if (new Set(costs.map((cost) => cost.to)).size !== 1) return undefined;
  const seen = new Set<string>();
  const candidates = costs
    .flatMap((cost) => returnCandidates(ctx, cost))
    .filter((candidate) => !seen.has(candidate.pickId) && seen.add(candidate.pickId));
  return payPickedReturnCost(ctx, candidates, out);
}

async function payPickedReturnCost(
  ctx: EffectContext,
  candidates: readonly ReturnCandidate[],
  out?: { paidCount: number },
): Promise<boolean> {
  if (candidates.length === 0) return false;
  ctx.payingCostDepth = (ctx.payingCostDepth ?? 0) + 1;
  let picked: string | undefined;
  try {
    [picked] = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((candidate) => candidate.pickId),
      visibleCards: candidates.map(({ pickId, cardId }) => ({ instanceId: pickId, cardId })),
      min: 1,
      max: 1,
    });
  } finally {
    ctx.payingCostDepth -= 1;
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
