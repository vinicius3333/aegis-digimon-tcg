import type { DecisionRequest, Permanent } from "@aegis/shared";
import type { CandidateZone } from "../../decisionModel";

/** A one-card pick spread across the digivolution cards of several of the viewer's Digimon. */
export interface SourceHostChoice {
  /** The viewer's Digimon holding at least one offered card, in battle-area order. */
  hostPermanentIds: string[];
  /** The offered cards under each host. */
  cardIdsByHost: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * Whether a dialog pick should first ask which Digimon to look under.
 *
 * "Play 1 card from any of your Digimon's digivolution cards" (EX12-077) otherwise lays every
 * source of every Digimon side by side, which says nothing about where each card sits. When the
 * pick is a single card and every offered card is a digivolution card of the viewer's own
 * Digimon, spread over two or more of them, the board picks the Digimon and the dialog shows
 * only that Digimon's cards.
 */
export function sourceHostChoiceFor({
  decision,
  answerOnBoard,
  candidates,
  yourBattleArea,
  max,
}: {
  decision: DecisionRequest | undefined;
  answerOnBoard: boolean;
  candidates: readonly { instanceId: string; zone?: CandidateZone }[];
  yourBattleArea: readonly Permanent[];
  max: number;
}): SourceHostChoice | undefined {
  if (decision === undefined || answerOnBoard || max !== 1) return undefined;
  if (decision.kind !== "selectCards" && decision.kind !== "chooseTargets") return undefined;
  if (candidates.length === 0 || candidates.some((candidate) => candidate.zone !== "digivolutionCards"))
    return undefined;
  const cardIdsByHost = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const host = yourBattleArea.find((permanent) =>
      permanent.stack.some((card) => card.instanceId === candidate.instanceId),
    );
    if (host === undefined) return undefined;
    const cards = cardIdsByHost.get(host.permanentId) ?? new Set<string>();
    cards.add(candidate.instanceId);
    cardIdsByHost.set(host.permanentId, cards);
  }
  if (cardIdsByHost.size < 2) return undefined;
  const hostPermanentIds = yourBattleArea
    .map((permanent) => permanent.permanentId)
    .filter((permanentId) => cardIdsByHost.has(permanentId));
  return { hostPermanentIds, cardIdsByHost };
}
