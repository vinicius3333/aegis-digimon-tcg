import { describe, expect, it } from "vitest";
import { getCardDefinition } from "../cards/registry.js";
import { CardColor } from "../schema/enums.js";
import {
  ALL_FAMOUS_DECKS,
  ADDITIONAL_COLLECTION_DECKS,
  CATALOG_DECKS,
  COMMUNITY_TOURNAMENT_DECKS,
  OFFICIAL_PRODUCT_DECKS,
  famousDeckById,
  famousDeckGroups,
  isFamousDeckAvailable,
  type FamousDeck,
} from "./index.js";

const futureDeck: FamousDeck = {
  deckId: "future-ex12-example",
  deckVersion: "future-ex12-example@1",
  name: "Future example",
  block: "EX12",
  archetype: "Future example",
  colors: [CardColor.Red],
  source: "Test fixture",
  decklist: { mainDeck: ["EX12-001"], eggDeck: [] },
};

describe("famous deck catalog", () => {
  it("keeps the historical catalog available through the operational cutoff", () => {
    expect(ALL_FAMOUS_DECKS).toHaveLength(337);
    expect(famousDeckGroups().flatMap((group) => group.decks)).toHaveLength(221);
  });

  it("withholds a whole future deck instead of truncating its list", () => {
    expect(isFamousDeckAvailable(futureDeck)).toBe(false);
    expect(isFamousDeckAvailable(futureDeck, "2026-07-03")).toBe(true);
    expect(futureDeck.decklist.mainDeck).toEqual(["EX12-001"]);
  });

  it("withholds a future-format result even when all of its cards are older", () => {
    const bt12OldCards = COMMUNITY_TOURNAMENT_DECKS.find((deck) => deck.deckId === "bt12-tj-ukge-2023");
    if (!bt12OldCards) throw new Error("BT12 old-card fixture is missing");
    expect(isFamousDeckAvailable(bt12OldCards, "2022-12-31")).toBe(false);
  });

  it("withholds a recipe built around a card the banlist forbids outright", () => {
    const bannedRecipe = ALL_FAMOUS_DECKS.find((deck) => deck.deckId === "ex5-gracenovamon-bandai");
    if (!bannedRecipe) throw new Error("EX5 GraceNovamon fixture is missing");
    expect(bannedRecipe.decklist.mainDeck).toContain("EX5-065");
    expect(isFamousDeckAvailable(bannedRecipe)).toBe(false);
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
      "EX5",
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
      "BT25",
      "BT25",
      "BT25",
      "BT25",
      "EX4",
      "EX5",
      "EX6",
      "EX7",
      "EX8",
      "EX9",
      "EX10",
      "EX11",
    ]);
    expect(OFFICIAL_PRODUCT_DECKS.every((deck) => deck.category === "official-recipe")).toBe(true);
    expect(famousDeckGroups().flatMap((group) => group.decks)).toHaveLength(221);
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

  it("names every stored deck the same way", () => {
    for (const deck of CATALOG_DECKS) {
      expect({ deckId: deck.deckId, name: deck.name }).toEqual({
        deckId: deck.deckId,
        name: `${deck.block} ${deck.archetype}`,
      });
    }
  });

  it("keeps competitive meta decks distinct from official product recipes", () => {
    expect(COMMUNITY_TOURNAMENT_DECKS).toHaveLength(289);
    expect(COMMUNITY_TOURNAMENT_DECKS[0]).toMatchObject({
      block: "BT4",
      category: "tournament-result",
      sourceType: "community_tournament_deck",
    });
  });

  it("stores at least eight sourced tournament results for every collection released after BT10", () => {
    const collections = [
      ...Array.from({ length: 15 }, (_, index) => `BT${index + 11}`),
      ...Array.from({ length: 10 }, (_, index) => `EX${index + 3}`),
      "RB1",
      "AD1",
    ];
    for (const collection of collections) {
      const decks = COMMUNITY_TOURNAMENT_DECKS.filter((deck) => deck.anchorProduct === collection);
      const archetypes = new Set(decks.map((deck) => deck.archetype));
      expect({
        collection,
        sourced: decks.length >= 8,
        distinctArchetypes: archetypes.size >= 6,
        credited: decks.every((deck) => deck.source.includes("#")),
      }).toEqual({ collection, sourced: true, distinctArchetypes: true, credited: true });
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
