import { getCardDefinition } from "./registry.js";

/**
 * Cost adjustments printed on the card being digivolved into that inspect the
 * live base stack. This is shared because the server charges the adjusted cost
 * while the client must present that same cost before sending the intent.
 */
export function intrinsicDigivolutionCostReductionFor(
  evolvingCardId: string,
  baseStackCardIds: readonly string[],
): number {
  if (evolvingCardId !== "BT10-086") return 0;
  return baseStackCardIds.some((cardId) => getCardDefinition(cardId)?.nameEn === "X Antibody")
    ? 2
    : 0;
}
