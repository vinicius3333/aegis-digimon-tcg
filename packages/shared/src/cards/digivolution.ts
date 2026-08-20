import { getCardDefinition } from "./registry.js";

/**
 * Cost adjustments printed on the card being digivolved into that inspect the
 * live base stack. This is shared because the server charges the adjusted cost
 * while the client must present that same cost before sending the intent.
 */
export function intrinsicDigivolutionCostReductionFor(
  evolvingCardId: string,
  baseStackCardIds: readonly string[],
  baseTopCardId?: string,
  baseFaceDownCardCount = 0,
): number {
  if (evolvingCardId === "BT22-061") {
    return baseTopCardId !== undefined && getCardDefinition(baseTopCardId)?.types?.includes("Ver.2") === true
      ? baseFaceDownCardCount
      : 0;
  }
  if (evolvingCardId === "BT22-076") {
    return baseTopCardId !== undefined && getCardDefinition(baseTopCardId)?.types?.includes("Ver.1") === true ? 2 : 0;
  }
  if (evolvingCardId !== "BT10-086") return 0;
  return baseStackCardIds.some((cardId) => getCardDefinition(cardId)?.nameEn === "X Antibody") ? 2 : 0;
}
