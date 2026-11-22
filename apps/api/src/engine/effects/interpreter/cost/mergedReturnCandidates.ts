import type { EffectContext } from "../../EffectContext.js";
import { candidateLooseInstances } from "../targeting/loose.js";
import { candidatePermanents } from "../targeting/permanents.js";
import type { Cost } from "@aegis/shared";

export type ReturnCandidate = { pickId: string; boundId: string; cardId: string; cost: Cost };

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

export function mergedReturnCandidates(ctx: EffectContext, costs: readonly Cost[]): ReturnCandidate[] | undefined {
  if (costs.length === 0 || !costs.every(isSingleCardReturn)) return undefined;
  if (new Set(costs.map((cost) => cost.to)).size !== 1) return undefined;
  const seen = new Set<string>();
  return costs
    .flatMap((cost) => returnCandidates(ctx, cost))
    .filter((candidate) => !seen.has(candidate.pickId) && seen.add(candidate.pickId));
}
