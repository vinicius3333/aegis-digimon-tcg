import { createHash } from "node:crypto";
import { ALL_FAMOUS_DECKS, getCardDefinition } from "@aegis/shared";
import { validateDecklist } from "../../engine/deckValidation.js";
import { getEffectModule } from "../../engine/effects/registry.js";

// Both archetypes appear in the current tracked meta (DCG Nexus, 27 Sep–4 Oct 2026).
export const EVOLUTION_DECK_VERSIONS = [
  "bt26-dgo-2026-09-05-1-glowing-dawn@1",
  "bt26-dgo-2026-08-28-1-toho-braves@1",
] as const;

export function evolutionDeck(version: string) {
  const source = ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === version || deck.deckId === version);
  if (source === undefined) throw new Error(`Unknown evolution deck ${version}`);
  const deck = { mainDeck: [...source.decklist.mainDeck], eggDeck: [...source.decklist.eggDeck] };
  const legality = validateDecklist(deck);
  if (!legality.ok) throw new Error(`Illegal evolution deck ${version}: ${legality.reason}`);
  for (const id of [...deck.mainDeck, ...deck.eggDeck]) {
    const definition = getCardDefinition(id)!;
    if ((definition.effectText?.trim() || definition.inheritedEffectText?.trim()) && getEffectModule(id) === undefined)
      throw new Error(`Evolution deck has an unimplemented card: ${id}`);
  }
  return {
    id: version,
    name: source.name,
    deck,
    sha256: createHash("sha256").update(JSON.stringify(deck)).digest("hex"),
  };
}
