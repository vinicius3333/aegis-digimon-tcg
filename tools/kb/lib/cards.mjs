// Card data access. The Q&A crawl and cross-checks are driven by the cardIds
// already present in the migrated card set.

import fs from "node:fs";
import { CARDS_PATH } from "./paths.mjs";

export function loadCards() {
  return JSON.parse(fs.readFileSync(CARDS_PATH, "utf8"));
}

export function loadCardIds() {
  return loadCards().map((card) => card.cardId);
}

export function loadCardIndex() {
  const index = new Map();
  for (const card of loadCards()) index.set(card.cardId, card);
  return index;
}
