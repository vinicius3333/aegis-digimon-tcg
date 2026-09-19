import { getCardDefinition } from "@aegis/shared";
import type { DecisionCandidate } from "./decisionTypes";

/** The combined play cost of every picked candidate, for decisions that cap a total spend. */
export function totalPlayCost({
  picks,
  candidates,
}: {
  picks: readonly string[];
  candidates: readonly DecisionCandidate[];
}): number {
  return picks.reduce((total, instanceId) => {
    const cardId = candidates.find((candidate) => candidate.instanceId === instanceId)?.cardId;
    return total + (getCardDefinition(cardId ?? "")?.playCost ?? 0);
  }, 0);
}

/** Whether one more pick fits; an existing pick always stays enabled so it can be removed. */
export function playCostBudgetAllowsCandidate({
  candidateInstanceId,
  picks,
  candidates,
  maxTotalPlayCost,
}: {
  candidateInstanceId: string;
  picks: readonly string[];
  candidates: readonly DecisionCandidate[];
  maxTotalPlayCost?: number;
}): boolean {
  if (maxTotalPlayCost === undefined || picks.includes(candidateInstanceId)) return true;
  return totalPlayCost({ picks: [...picks, candidateInstanceId], candidates }) <= maxTotalPlayCost;
}
