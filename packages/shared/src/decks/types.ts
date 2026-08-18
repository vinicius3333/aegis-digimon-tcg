import type { CardColor } from "../schema/enums.js";

export type BlockLabel = string;

export interface DeckEntry {
  cardId: string;
  count: number;
}

export interface FamousDecklist {
  readonly mainDeck: readonly string[];
  readonly eggDeck: readonly string[];
}

/** A sourced, versioned deck recipe shared by gameplay and presentation. */
export interface FamousDeck {
  deckId: string;
  deckVersion: string;
  name: string;
  block: BlockLabel;
  archetype: string;
  colors: readonly CardColor[];
  source: string;
  sourceUrl?: string;
  sourceType?: "product_recipe" | "championship_deck" | "community_tournament_deck";
  anchorProduct?: string;
  approximation?: string;
  category?: "historical-meta" | "official-recipe" | "tournament-result";
  decklist: FamousDecklist;
}

/** Compatibility name used by the tournament bot subsystem. */
export type MetaDeck = FamousDeck;

export function expandDeckEntries(entries: readonly DeckEntry[]): string[] {
  const cards: string[] = [];
  for (const { cardId, count } of entries) {
    for (let copy = 0; copy < count; copy += 1) cards.push(cardId);
  }
  return cards;
}

const frozenCards = (cards: string[]): readonly string[] => Object.freeze(cards);

export function defineMetaDeck(
  input: Omit<FamousDeck, "decklist" | "deckVersion"> & {
    revision: number;
    mainDeck: readonly DeckEntry[];
    eggDeck: readonly DeckEntry[];
  },
): FamousDeck {
  const { revision, mainDeck, eggDeck, ...rest } = input;
  return Object.freeze({
    ...rest,
    colors: Object.freeze([...rest.colors]),
    deckVersion: `${rest.deckId}@${revision}`,
    decklist: Object.freeze({
      mainDeck: frozenCards(expandDeckEntries(mainDeck)),
      eggDeck: frozenCards(expandDeckEntries(eggDeck)),
    }),
  });
}
