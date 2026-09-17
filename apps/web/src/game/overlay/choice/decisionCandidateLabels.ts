import type { Translate } from "../../../i18n";
import type { DecisionCandidate } from "./decisionTypes";

/** The two abstract targets a decision can offer instead of a card: a player's security pile. */
export function abstractTargetLabel({ instanceId, t }: { instanceId: string; t: Translate }): string | undefined {
  if (instanceId === "mine") return t("overlay.yourSecurity");
  if (instanceId === "player" || instanceId === "opponent") return t("overlay.opponentSecurity");
  return undefined;
}

/** "(copy N of M)" for each instance of a card id that appears more than once among the candidates. */
export function cardCopyLabelsByInstance({
  candidates,
  t,
}: {
  candidates: readonly DecisionCandidate[];
  t: Translate;
}): Map<string, string> {
  const cardIdTotals = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.cardId) cardIdTotals.set(candidate.cardId, (cardIdTotals.get(candidate.cardId) ?? 0) + 1);
  }
  const cardIdSeen = new Map<string, number>();
  const cardCopyLabels = new Map<string, string>();
  for (const candidate of candidates) {
    if (!candidate.cardId) continue;
    const total = cardIdTotals.get(candidate.cardId) ?? 0;
    const index = (cardIdSeen.get(candidate.cardId) ?? 0) + 1;
    cardIdSeen.set(candidate.cardId, index);
    if (total > 1) cardCopyLabels.set(candidate.instanceId, t("overlay.cardCopy", { index, total }));
  }
  return cardCopyLabels;
}
