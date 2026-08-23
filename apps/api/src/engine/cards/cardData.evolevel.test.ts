import { describe, it, expect } from "vitest";
import { CardColor, CardKind, type CardDefinition } from "@aegis/shared";
import { matchingEvoCost, matchingEvoCostIgnoringColor, canDigivolveOnto } from "./cardData.js";

// A3 (BLK-05.1): the digivolve EvoCost level test is EXACT equality, mirroring the
// documented behavior oracle `targetPermanent.Level == evoCost.Level` (documented behavior), NOT the
// old `baseLevel <= cost.level`. A base may digivolve onto an EvoCost only when its
// level equals the EvoCost level exactly; a level-less (Lv.-) base satisfies nothing
// (WR-05 Q4242 guard). The fails-when-reverted lever: restoring `baseLevel <= cost.level`
// at cardData.ts:173/:202 flips the Lv.3-reject assertion below RED.

// A Lv.4 Green evolver whose single EvoCost requires a Green Lv.4 base for 2 memory.
const lvl4GreenEvolver: CardDefinition = {
  cardId: "TEST-EVOLEVEL-EVO",
  set: "TEST",
  nameEn: "Test Evo-Level Evolver",
  kinds: [CardKind.Digimon],
  colors: [CardColor.Green],
  level: 4,
  playCost: 6,
  dp: 5000,
  evoCosts: [{ color: CardColor.Green, level: 4, memoryCost: 2 }],
  maxCountInDeck: 4,
};

const greenLvl4: CardDefinition = {
  cardId: "TEST-EVOLEVEL-G4",
  set: "TEST",
  nameEn: "Green Base Lv.4",
  kinds: [CardKind.Digimon],
  colors: [CardColor.Green],
  level: 4,
  playCost: 4,
  dp: 4000,
  evoCosts: [],
  maxCountInDeck: 4,
};

const greenLvl3: CardDefinition = { ...greenLvl4, cardId: "TEST-EVOLEVEL-G3", level: 3 };
const greenLvl5: CardDefinition = { ...greenLvl4, cardId: "TEST-EVOLEVEL-G5", level: 5 };
// A level-less base (Lv.-): a Tamer-like card carries no level.
const levellessBase: CardDefinition = {
  ...greenLvl4,
  cardId: "TEST-EVOLEVEL-LVNONE",
  level: undefined,
};

describe("evo level exact match (BLK-05.1)", () => {
  it("accepts a Lv.4 base for a Lv.4 EvoCost (exact equality)", () => {
    const cost = matchingEvoCost(lvl4GreenEvolver, greenLvl4);
    expect(cost?.memoryCost).toBe(2);
    expect(canDigivolveOnto(lvl4GreenEvolver, greenLvl4)).toBe(true);
  });

  it("REJECTS a Lv.3 base for a Lv.4 EvoCost (the <= bug)", () => {
    // Under the reverted `baseLevel <= cost.level`, a Lv.3 base would WRONGLY match.
    expect(matchingEvoCost(lvl4GreenEvolver, greenLvl3)).toBeUndefined();
    expect(canDigivolveOnto(lvl4GreenEvolver, greenLvl3)).toBe(false);
  });

  it("REJECTS a Lv.5 base for a Lv.4 EvoCost", () => {
    expect(matchingEvoCost(lvl4GreenEvolver, greenLvl5)).toBeUndefined();
    expect(canDigivolveOnto(lvl4GreenEvolver, greenLvl5)).toBe(false);
  });

  it("color-waiver path is exact-level only (Lv.4 yes, Lv.3/Lv.5 no)", () => {
    expect(matchingEvoCostIgnoringColor(lvl4GreenEvolver, greenLvl4)?.memoryCost).toBe(2);
    expect(matchingEvoCostIgnoringColor(lvl4GreenEvolver, greenLvl3)).toBeUndefined();
    expect(matchingEvoCostIgnoringColor(lvl4GreenEvolver, greenLvl5)).toBeUndefined();
  });

  it("rejects a level-less (Lv.-) base from both helpers (WR-05 Q4242)", () => {
    expect(matchingEvoCost(lvl4GreenEvolver, levellessBase)).toBeUndefined();
    expect(matchingEvoCostIgnoringColor(lvl4GreenEvolver, levellessBase)).toBeUndefined();
  });
});
