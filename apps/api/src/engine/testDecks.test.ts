import { describe, it, expect } from "vitest";
import { ALL_FAMOUS_DECKS, isFamousDeckAvailable, requireCardDefinition, CardKind } from "@aegis/shared";
import {
  BOT_DECKS,
  RED_DECK,
  BLUE_DECK,
  TEST_DECKS,
  assertLegalDeck,
  botDeckFor,
  deckColor,
  MAIN_DECK_SIZE,
  MAX_EGG_DECK_SIZE,
  type Decklist,
} from "./testDecks.js";

/**
 * The two built-in test decks must be legal-shaped so a match can be dealt from them
 * (deck-and-setup; Comprehensive Rules §1-4). The decks self-validate at module load;
 * these tests document the invariants and guard against a future edit breaking them.
 */
describe("test decks", () => {
  for (const [name, deck] of [
    ["RED", RED_DECK],
    ["BLUE", BLUE_DECK],
  ] as const) {
    describe(name, () => {
      it("has exactly 50 main-deck cards", () => {
        expect(deck.mainDeck.length).toBe(MAIN_DECK_SIZE);
      });

      it("has at most 5 egg-deck cards", () => {
        expect(deck.eggDeck.length).toBeLessThanOrEqual(MAX_EGG_DECK_SIZE);
      });

      it("references only known cards within their copy limits", () => {
        const counts = new Map<string, number>();
        for (const id of [...deck.mainDeck, ...deck.eggDeck]) {
          const def = requireCardDefinition(id);
          counts.set(id, (counts.get(id) ?? 0) + 1);
          expect(counts.get(id)!).toBeLessThanOrEqual(def.maxCountInDeck);
        }
      });

      it("keeps Digi-Eggs only in the egg deck", () => {
        for (const id of deck.mainDeck) {
          expect(requireCardDefinition(id).kinds.includes(CardKind.DigiEgg)).toBe(false);
        }
        for (const id of deck.eggDeck) {
          expect(requireCardDefinition(id).kinds.includes(CardKind.DigiEgg)).toBe(true);
        }
      });

      it("is mono-color (coherent and playable)", () => {
        const color = deckColor(deck);
        expect(color).toBeDefined();
        for (const id of deck.mainDeck) {
          expect(requireCardDefinition(id).colors).toContain(color);
        }
      });

      it("passes assertLegalDeck", () => {
        expect(() => assertLegalDeck(deck)).not.toThrow();
      });
    });
  }

  it("exposes both decks via TEST_DECKS, indexed by seat", () => {
    expect(TEST_DECKS).toHaveLength(2);
    expect(TEST_DECKS[0]).toBe(RED_DECK);
    expect(TEST_DECKS[1]).toBe(BLUE_DECK);
  });

  it("rejects an illegal deck (wrong main-deck size)", () => {
    const tooSmall: Decklist = { mainDeck: RED_DECK.mainDeck.slice(0, 49), eggDeck: [] };
    expect(() => assertLegalDeck(tooSmall)).toThrow(/exactly 50/);
  });
});

describe("botDeckFor", () => {
  it("plays the requested famous-deck preset when the id resolves", () => {
    const requested = ALL_FAMOUS_DECKS.find(isFamousDeckAvailable);
    expect(requested).toBeDefined();
    const deck = botDeckFor(requested!.deckId);
    expect(deck.mainDeck).toEqual([...requested!.decklist.mainDeck]);
    expect(deck.eggDeck).toEqual([...requested!.decklist.eggDeck]);
  });

  it("falls back to the random pool for an unknown id and for no preference", () => {
    expect(BOT_DECKS).toContain(botDeckFor("not-a-deck-id"));
    expect(BOT_DECKS).toContain(botDeckFor());
  });
});
