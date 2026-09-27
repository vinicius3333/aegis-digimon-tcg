import { createHash } from "node:crypto";
import { ALL_FAMOUS_DECKS } from "@aegis/shared";
import { assertLegalDeck } from "../../engine/testDecks.js";

export const TRAINING_DECK_VERSIONS = [
  "bt26-dgo-2026-09-05-1-glowing-dawn@1",
  "bt26-dgo-2026-09-05-2-abbadomon@1",
] as const;

export function trainingDeck(version: string) {
  if (!TRAINING_DECK_VERSIONS.some((allowed) => allowed === version))
    throw new Error(`Deck is outside the BT26 training scope: ${version}`);
  const source = ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === version);
  if (source === undefined) throw new Error(`Missing pinned training deck ${version}`);
  const deck = { mainDeck: [...source.decklist.mainDeck], eggDeck: [...source.decklist.eggDeck] };
  assertLegalDeck(deck);
  const sha256 = createHash("sha256").update(JSON.stringify(deck)).digest("hex");
  return { version, name: source.name, sha256, deck };
}
