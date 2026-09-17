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
