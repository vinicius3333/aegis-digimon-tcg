import artsJson from "./data/arts.json" with { type: "json" };
import { cardData } from "./data/index.js";
import type { CardArt } from "./types.js";

const alternateArts: Readonly<Record<string, readonly CardArt[]>> = artsJson;

/** Cosmetic printing IDs never become the card's rules identity. */
export function getCardArts(cardId: string): readonly CardArt[] {
  const base: CardArt = {
    artId: cardId,
    imageId: (Object.hasOwn(cardData, cardId) ? cardData[cardId]?.imageId : undefined) ?? cardId,
    label: "Original art",
  };
  return [base, ...(Object.hasOwn(alternateArts, cardId) ? alternateArts[cardId]! : [])];
}

/** Reject foreign/unknown printing IDs and retain compatibility with older decks. */
export function resolveCardArt(cardId: string, artId?: string): CardArt {
  const arts = getCardArts(cardId);
  return arts.find((art) => art.artId === artId) ?? arts[0]!;
}
