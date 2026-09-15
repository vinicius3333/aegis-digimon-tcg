import { createHash } from "node:crypto";
import { releaseDateForSet } from "@aegis/shared";
import type { Decklist } from "../engine/testDecks.js";
import { assertLegalDeck } from "../engine/testDecks.js";
import type { FuzzDeck } from "./battleFuzzer.js";

interface StoredDeckShape {
  mainDeck?: unknown;
  eggDeck?: unknown;
  main_deck?: unknown;
  egg_deck?: unknown;
}

/** Stable newest-first ordering for catalog sources; unknown dates remain last. */
export function newestDeckSources<T extends { block: string }>(sources: readonly T[]): T[] {
  return [...sources].sort((left, right) =>
    (releaseDateForSet(right.block) ?? "").localeCompare(releaseDateForSet(left.block) ?? ""),
  );
}

function cardIds(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((cardId) => typeof cardId !== "string")) {
    throw new Error(`${field} must be an array of card ids`);
  }
  return [...value] as string[];
}

/** Parse an anonymized saved-deck export. Account ids and deck names are intentionally ignored. */
export function parseDeckCorpus(value: unknown): FuzzDeck[] {
  if (!Array.isArray(value)) throw new Error("Deck corpus must be a JSON array");
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) throw new Error(`Deck ${index} must be an object`);
    const stored = entry as StoredDeckShape;
    const deck: Decklist = {
      mainDeck: cardIds(stored.mainDeck ?? stored.main_deck, `Deck ${index} mainDeck`),
      eggDeck: cardIds(stored.eggDeck ?? stored.egg_deck, `Deck ${index} eggDeck`),
    };
    assertLegalDeck(deck);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ mainDeck: [...deck.mainDeck].sort(), eggDeck: [...deck.eggDeck].sort() }))
      .digest("hex")
      .slice(0, 12);
    return { id: `saved-${fingerprint}`, deck };
  });
}
