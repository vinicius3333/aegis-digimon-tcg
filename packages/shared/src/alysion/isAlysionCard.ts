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
  ...appOnlySets,
]);

const alysionEntryDeckPromos: ReadonlySet<string> = new Set(
  [2, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((number) => `P-${String(number).padStart(3, "0")}`),
);

export function isAlysionCard(card: Readonly<Pick<CardDefinition, "cardId" | "set">>): boolean {
  return alysionSets.has(card.set) || alysionEntryDeckPromos.has(card.cardId);
}
