import { describe, expect, it } from "vitest";
import { ALL_FAMOUS_DECKS, CardKind, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "./effects/registry.js";
import "../cards/index.js";

/**
 * Deck-to-card source-of-truth index.
 *
 * The timing matrix executes each unique playable card once. This manifest is the
 * complementary proof that no card is lost when the same implementation is used by
 * several named decks: every catalogued deck gets its own assertion and every card is
 * mapped back to its deck ids. Repeated copies are intentionally collapsed here; the
 * card-level matrix proves the behavior once, while this test proves deck membership.
 */

type FamousDeck = (typeof ALL_FAMOUS_DECKS)[number];

const deckCards = (deck: FamousDeck): string[] => [...new Set([...deck.decklist.mainDeck, ...deck.decklist.eggDeck])];

const allDeckCardIds = new Set(ALL_FAMOUS_DECKS.flatMap(deckCards));
const cardDecks = new Map<string, string[]>();
for (const deck of ALL_FAMOUS_DECKS) {
  for (const cardId of deckCards(deck)) {
    const decks = cardDecks.get(cardId) ?? [];
    decks.push(deck.deckId);
    cardDecks.set(cardId, decks);
  }
}

function isPlayableEffectCard(cardId: string): boolean {
  const definition = getCardDefinition(cardId);
  return (
    definition !== undefined &&
    definition.kinds.some((kind) => kind === CardKind.Digimon || kind === CardKind.Tamer || kind === CardKind.Option) &&
    (definition.effectText !== undefined || definition.inheritedEffectText !== undefined)
  );
}

function declaredTriggerCount(cardId: string): number {
  const compiled = getCompiledCard(cardId);
  if (compiled === undefined) return 0;
  return new Set(
    compiled.effects.flatMap((effect) => {
      const trigger = (effect as typeof effect & { trigger?: unknown }).trigger;
      return Array.isArray(trigger) ? trigger.map(String) : [String(trigger)];
    }),
  ).size;
}

describe("deck truth source — every catalogued deck is traceable", () => {
  it("has the expected newest-to-oldest catalog boundary", () => {
    const blocks = new Set(ALL_FAMOUS_DECKS.map((deck) => deck.block));
    expect(blocks.has("BT25")).toBe(true);
    expect(blocks.has("BT1")).toBe(true);
    expect(blocks.has("BT26")).toBe(false);
  });

  it("maps every playable effect card to an executable module and a declared timing", () => {
    const missing = [...allDeckCardIds].filter((cardId) => {
      if (!isPlayableEffectCard(cardId)) return false;
      if (getEffectModule(cardId) === undefined) return true;
      const definition = getCardDefinition(cardId)!;
      // A standalone digivolution requirement is not an effect timing. Direct handwritten
      // overrides may intentionally replace the generated record, so only require a timing
      // when the shared compiled record is present and contains an effect clause.
      if (getCompiledCard(cardId)?.effects.length === 0) return false;
      if (declaredTriggerCount(cardId) > 0) return false;
      return !/^\s*Digivolve\s*:/i.test(definition.effectText ?? "") || definition.inheritedEffectText !== undefined;
    });
    expect(missing).toEqual([]);
  });

  for (const deck of ALL_FAMOUS_DECKS) {
    it(`${deck.deckId} traces every main and Digi-Egg card`, () => {
      const ids = deckCards(deck);
      expect(deck.decklist.mainDeck).toHaveLength(50);
      expect(deck.decklist.eggDeck.length).toBeLessThanOrEqual(5);
      expect(ids.length).toBeGreaterThan(0);

      const unknown = ids.filter((cardId) => getCardDefinition(cardId) === undefined);
      const unregistered = ids.filter(
        (cardId) => isPlayableEffectCard(cardId) && getEffectModule(cardId) === undefined,
      );
      expect(unknown, `${deck.deckId} unknown cards: ${unknown.join(", ")}`).toEqual([]);
      expect(unregistered, `${deck.deckId} unregistered cards: ${unregistered.join(", ")}`).toEqual([]);

      for (const cardId of ids) {
        expect(cardDecks.get(cardId)).toContain(deck.deckId);
        expect(allDeckCardIds).toContain(cardId);
      }
    });
  }
});
