import { describe, expect, it } from "vitest";
import { getCardDefinition } from "../cards/registry.js";
import { CardColor } from "../schema/enums.js";
import {
  ALL_FAMOUS_DECKS,
  ADDITIONAL_COLLECTION_DECKS,
  COMMUNITY_TOURNAMENT_DECKS,
  OFFICIAL_PRODUCT_DECKS,
  famousDeckById,
  famousDeckGroups,
  isFamousDeckAvailable,
  type FamousDeck,
} from "./index.js";

const futureDeck: FamousDeck = {
  deckId: "future-bt21-example",
  deckVersion: "future-bt21-example@1",
  name: "Future example",
  block: "BT21",
  archetype: "Future example",
  colors: [CardColor.Red],
  source: "Test fixture",
  decklist: { mainDeck: ["EX3-001"], eggDeck: [] },
};

describe("famous deck catalog", () => {
  it("keeps the historical catalog available through the operational BT20 cutoff", () => {
    expect(ALL_FAMOUS_DECKS).toHaveLength(124);
    expect(famousDeckGroups().flatMap((group) => group.decks)).toHaveLength(91);
  });

  it("withholds a whole future deck instead of truncating its list", () => {
    expect(isFamousDeckAvailable(futureDeck)).toBe(false);
    expect(isFamousDeckAvailable(futureDeck, "2025-04-25")).toBe(true);
    expect(futureDeck.decklist.mainDeck).toEqual(["EX3-001"]);
  });

  it("withholds a future-format result even when all of its cards are older", () => {
    const bt22OldCards = COMMUNITY_TOURNAMENT_DECKS.find((deck) => deck.deckId === "bt22-dgo-2025-09-20-2-leviamon");
    if (!bt22OldCards) throw new Error("BT22 old-card fixture is missing");
    expect(isFamousDeckAvailable(bt22OldCards)).toBe(false);
  });

  it("groups available decks from the most recent format collection to the oldest", () => {
    const groups = famousDeckGroups([...ALL_FAMOUS_DECKS, futureDeck]);

    expect(groups.map((group) => group.collection)).toEqual([
      "BT20",
      "BT19",
      "EX8",
      "BT18",
      "EX7",
      "BT17",
      "EX6",
      "BT16",
      "BT15",
      "BT14",
      "RB1",
      "BT13",
      "EX4",
      "BT12",
      "BT11",
      "EX3",
      "BT10",
      "BT9",
      "EX2",
      "BT8",
      "BT7",
      "EX1",
      "BT6",
      "BT5",
      "BT4",
      "BT3",
      "BT2",
      "BT1",
    ]);
    expect(groups.flatMap((group) => group.decks)).not.toContain(futureDeck);
  });

  it("locates presets by their stable identifier", () => {
    expect(famousDeckById("bt1-red-omnimon")?.deckVersion).toBe("bt1-red-omnimon@1");
    expect(famousDeckById("missing-deck")).toBeUndefined();
  });

  it("stores official recipes for the collections beyond the active cutoff", () => {
    expect(OFFICIAL_PRODUCT_DECKS.map((deck) => deck.block)).toEqual([
      "BT12",
      "BT13",
      "BT14",
      "BT15",
      "BT16",
      "BT17",
      "BT18",
      "BT19",
      "BT20",
      "BT21",
      "BT22",
      "BT23",
      "BT24",
      "EX4",
      "EX5",
      "EX6",
      "EX7",
      "EX8",
      "EX9",
      "EX10",
    ]);
    expect(OFFICIAL_PRODUCT_DECKS.every((deck) => deck.sourceUrl?.startsWith("https://world.digimoncard.com/"))).toBe(
      true,
    );
    expect(famousDeckGroups().flatMap((group) => group.decks)).toHaveLength(91);
  });

  it("covers every booster collection represented in the registry", () => {
    const coveredCollections = new Set(ALL_FAMOUS_DECKS.map((deck) => deck.block));
    const expectedCollections = [
      ...Array.from({ length: 25 }, (_, index) => `BT${index + 1}`),
      ...Array.from({ length: 12 }, (_, index) => `EX${index + 1}`),
      "AD1",
      "RB1",
    ];
    expect(expectedCollections.filter((collection) => !coveredCollections.has(collection))).toEqual([]);
  });

  it("keeps every stored recipe structurally complete and resolvable", () => {
    for (const deck of [...OFFICIAL_PRODUCT_DECKS, ...ADDITIONAL_COLLECTION_DECKS, ...COMMUNITY_TOURNAMENT_DECKS]) {
      expect({
        deckId: deck.deckId,
        mainCount: deck.decklist.mainDeck.length,
        eggCount: deck.decklist.eggDeck.length,
        unknownCards: [...deck.decklist.mainDeck, ...deck.decklist.eggDeck].filter(
          (cardId) => !getCardDefinition(cardId),
        ),
      }).toEqual({ deckId: deck.deckId, mainCount: 50, eggCount: expect.any(Number), unknownCards: [] });
      expect(deck.decklist.eggDeck.length).toBeLessThanOrEqual(5);
    }
  });

  it("keeps competitive meta decks distinct from official product recipes", () => {
    expect(COMMUNITY_TOURNAMENT_DECKS).toHaveLength(66);
    expect(COMMUNITY_TOURNAMENT_DECKS[0]).toMatchObject({
      block: "BT12",
      category: "tournament-result",
      sourceType: "community_tournament_deck",
    });
  });

  it("stores two sourced Digital Gate Open results for every format from BT17 through BT25", () => {
    for (let collection = 17; collection <= 25; collection += 1) {
      const decks = COMMUNITY_TOURNAMENT_DECKS.filter((deck) => deck.anchorProduct === `BT${collection}`);
      expect(decks).toHaveLength(2);
      expect(
        decks.every(
          (deck) =>
            deck.sourceType === "community_tournament_deck" &&
            deck.sourceUrl?.startsWith("https://digitalgateopen.com/deck-tournament/") === true,
        ),
      ).toBe(true);
    }
  });

  it("adds sourced tournament choices to the active formats from BT10 backwards", () => {
    const expected = new Map([
      ["BT10", 3],
      ["BT9", 3],
      ["BT8", 2],
      ["BT7", 3],
      ["BT4", 3],
    ]);
    for (const [collection, count] of expected) {
      const decks = COMMUNITY_TOURNAMENT_DECKS.filter(
        (deck) => deck.anchorProduct === collection && deck.deckId.includes("-dgo-202"),
      );
      expect(decks).toHaveLength(count);
      expect(decks.every((deck) => isFamousDeckAvailable(deck))).toBe(true);
    }
  });

  it("versions and discloses tournament recipes adapted to the current banlist", () => {
    const adaptedIds = [
      "bt10-dgo-2022-11-19-4-metalgarurumon",
      "bt9-dgo-2022-10-01-3-metalgarurumon",
      "bt8-dgo-2022-06-11-1-yellow-hybrid",
      "bt8-dgo-2022-06-11-4-imperialdramon",
      "bt7-dgo-2022-04-23-1-blue-hybrid",
      "bt7-dgo-2022-04-23-4-green-hybrid",
      "bt7-dgo-2022-04-23-5-lilithmon",
      "bt4-dgo-2021-06-26-2-wargreymon",
      "bt4-dgo-2021-06-26-3-imperialdramon",
    ];

    for (const deckId of adaptedIds) {
      const deck = famousDeckById(deckId);
      expect(deck?.deckVersion).toBe(`${deckId}@2`);
      expect(deck?.approximation).toContain("Adapted to the current banlist");
    }
  });
});
