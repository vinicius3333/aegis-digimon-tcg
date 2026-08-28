import type { CardDefinition } from "../types.js";
import cardsJson from "./cards.json" with { type: "json" };

/**
 * Committed card data from the maintained card-data snapshot.
 * The committed `cards.json` is the source of truth so the runtime has no network
 * dependency (ARCHITECTURE.md section 7 "Card data flow").
 *
 * The JSON is authored in the CardDefinition shape; its color/kind/rarity strings
 * match the string-valued CardColor/CardKind enums, so the array is a CardDefinition[].
 */
export const cardList: readonly CardDefinition[] = cardsJson as unknown as CardDefinition[];

/** Card data keyed by card id (the lookup the registry reads). */
export const cardData: Readonly<Record<string, CardDefinition>> = Object.freeze(
  Object.fromEntries(cardList.map((card) => [card.cardId, card])),
);
