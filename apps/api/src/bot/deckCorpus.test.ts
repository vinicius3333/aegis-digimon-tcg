import { describe, expect, it } from "vitest";
import { RED_DECK } from "../engine/testDecks.js";
import { parseDeckCorpus } from "./deckCorpus.js";

describe("saved deck fuzz corpus", () => {
  it("accepts database column names and generates an anonymous stable id", () => {
    const first = parseDeckCorpus([
      { id: "private-user-value", main_deck: RED_DECK.mainDeck, egg_deck: RED_DECK.eggDeck },
    ]);
    const second = parseDeckCorpus([{ main_deck: RED_DECK.mainDeck, egg_deck: RED_DECK.eggDeck }]);

    expect(first[0]!.id).toMatch(/^saved-[0-9a-f]{12}$/);
    expect(second[0]!.id).toBe(first[0]!.id);
  });

  it("rejects malformed or illegal saved decks before running matches", () => {
    expect(() => parseDeckCorpus([{ mainDeck: ["BT1-009"], eggDeck: [] }])).toThrow("exactly 50");
  });
});
