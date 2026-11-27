import { appOnlySets } from "#shared/cards/appOnlySets";
import type { CardDefinition } from "#shared/cards/types";

const alysionSets: ReadonlySet<string> = new Set([
  "BT1",
  "BT2",
  "BT3",
  "BT4",
  "ST1",
  "ST2",
  "ST3",
  "ST4",
  "ST5",
  "ST6",
  "SD01",
  "SD02",
  "BD01",
  "BD02",
  ...appOnlySets,
]);

const ALYSION_LAST_PROMO_NUMBER = 27;

const alysionPromos: ReadonlySet<string> = new Set(
  Array.from({ length: ALYSION_LAST_PROMO_NUMBER }, (_, index) => `P-${String(index + 1).padStart(3, "0")}`),
);

export function isAlysionCard(card: Readonly<Pick<CardDefinition, "cardId" | "set">>): boolean {
  return alysionSets.has(card.set) || alysionPromos.has(card.cardId);
}
