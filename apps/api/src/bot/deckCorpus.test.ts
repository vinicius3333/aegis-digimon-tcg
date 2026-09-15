import { describe, expect, it } from "vitest";
import { RED_DECK } from "../engine/testDecks.js";
import { newestDeckSources, parseDeckCorpus } from "./deckCorpus.js";

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

describe("newest deck selection", () => {
  it("puts newer sets first while preserving catalog order for ties and unknown sets", () => {
    const sources = [
      { id: "unknown-a", block: "UNKNOWN" },
      { id: "ex12-a", block: "EX12" },
      { id: "bt26-a", block: "BT26" },
      { id: "bt26-b", block: "BT26" },
      { id: "unknown-b", block: "UNKNOWN" },
    ];

    expect(newestDeckSources(sources).map(({ id }) => id)).toEqual([
      "bt26-a",
      "bt26-b",
      "ex12-a",
      "unknown-a",
      "unknown-b",
    ]);
    expect(sources[0]!.id).toBe("unknown-a");
  });
});
