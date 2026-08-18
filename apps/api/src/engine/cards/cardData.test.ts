import { describe, it, expect } from "vitest";
import { CardColor, CardKind, type CardDefinition } from "@aegis/shared";
import {
  lookupDefinition,
  definitionOf,
  isKnownCard,
  knownCardIds,
  allDefinitions,
  colorsOf,
  hasColor,
  levelOf,
  dpOf,
  playCostOf,
  hasPlayCost,
  evoCostsOf,
  isDigimon,
  isTamer,
  isDigiEgg,
  isPermanentKind,
  isAce,
  isDualKind,
  matchingEvoCost,
  canDigivolveOnto,
} from "./cardData.js";

// These tests run against the real generated card table (cards.json), so they
// also guard the extractor's output shape for a couple of representative cards.

describe("card-data lookup", () => {
  it("looks up a known card and throws for an unknown one", () => {
    expect(lookupDefinition("BT7-089")?.nameEn).toBe("J.P. Shibayama");
    expect(lookupDefinition("does-not-exist")).toBeUndefined();
    expect(isKnownCard("BT7-089")).toBe(true);
    expect(isKnownCard("does-not-exist")).toBe(false);
    expect(() => definitionOf("does-not-exist")).toThrow(/Unknown cardId/);
  });

  it("accepts a CardInstance-like object for definitionOf", () => {
    const def = definitionOf({ cardId: "BT15-002" } as never);
    expect(def.nameEn).toBe("Tsunomon");
  });

  it("exposes the full table consistently", () => {
    const ids = knownCardIds();
    expect(ids.length).toBeGreaterThan(4000);
    expect(allDefinitions().length).toBe(ids.length);
    // Sorted ascending by cardId (generated invariant).
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });
});

describe("derived static facts", () => {
  it("reads colors / level / DP / play cost for a Tamer (BT7-089)", () => {
    expect(colorsOf("BT7-089")).toEqual([CardColor.Green]);
    expect(hasColor("BT7-089", CardColor.Green)).toBe(true);
    expect(hasColor("BT7-089", CardColor.Red)).toBe(false);
    expect(levelOf("BT7-089")).toBeUndefined(); // Tamer has no level
    expect(dpOf("BT7-089")).toBe(0);
    expect(playCostOf("BT7-089")).toBe(3);
    expect(hasPlayCost("BT7-089")).toBe(true);
  });

  it("classifies kinds and permanence", () => {
    expect(isTamer("BT7-089")).toBe(true);
    expect(isDigimon("BT7-089")).toBe(false);
    expect(isPermanentKind("BT7-089")).toBe(true); // Tamers are permanents
    expect(isDigiEgg("BT15-002")).toBe(true);
    expect(isPermanentKind("BT15-002")).toBe(true); // DigiEggs are permanents
  });

  it("treats a DigiEgg as having no payable play cost (-1)", () => {
    expect(playCostOf("BT15-002")).toBe(-1);
    expect(hasPlayCost("BT15-002")).toBe(false);
    expect(levelOf("BT15-002")).toBe(2);
  });

  it("reports ACE and dual-kind flags from the definition", () => {
    expect(isAce("BT7-089")).toBe(false);
    expect(isDualKind("BT7-089")).toBe(false);
  });
});

describe("digivolution matching (static-data half)", () => {
  // A synthetic level-4 Green Digimon whose EvoCost accepts a Green base of level
  // <= 3 for 2 memory. Uses the real registry only via the base lookups.
  const level4Green: CardDefinition = {
    cardId: "TEST-EVO",
    set: "TEST",
    nameEn: "Test Evolver",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Green],
    level: 4,
    playCost: 6,
    dp: 5000,
    evoCosts: [{ color: CardColor.Green, level: 3, memoryCost: 2 }],
    maxCountInDeck: 4,
  };

  const greenLvl3: CardDefinition = {
    cardId: "TEST-BASE-G3",
    set: "TEST",
    nameEn: "Green Base 3",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Green],
    level: 3,
    playCost: 4,
    dp: 4000,
    evoCosts: [],
    maxCountInDeck: 4,
  };

  const redLvl3: CardDefinition = { ...greenLvl3, colors: [CardColor.Red], cardId: "TEST-BASE-R3" };
  const greenLvl4: CardDefinition = { ...greenLvl3, level: 4, cardId: "TEST-BASE-G4" };

  it("matches on color and level<=requirement, returning the cost", () => {
    const cost = matchingEvoCost(level4Green, greenLvl3);
    expect(cost?.memoryCost).toBe(2);
    expect(canDigivolveOnto(level4Green, greenLvl3)).toBe(true);
  });

  it("rejects a wrong-color base", () => {
    expect(matchingEvoCost(level4Green, redLvl3)).toBeUndefined();
    expect(canDigivolveOnto(level4Green, redLvl3)).toBe(false);
  });

  it("rejects a base above the required level", () => {
    expect(canDigivolveOnto(level4Green, greenLvl4)).toBe(false);
  });

  it("evoCostsOf returns the printed entries", () => {
    expect(evoCostsOf(level4Green)).toHaveLength(1);
  });
});
