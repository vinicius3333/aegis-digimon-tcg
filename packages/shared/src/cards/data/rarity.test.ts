import { describe, expect, it } from "vitest";
import { cardData, cardList } from "./index.js";

const HISTORICAL_SECRET_RARES = [
  "BT1-114",
  "BT1-115",
  "BT2-111",
  "BT2-112",
  "BT3-111",
  "BT3-112",
  "BT4-113",
  "BT4-114",
  "BT4-115",
  "BT5-111",
  "BT5-112",
  "BT6-111",
  "BT6-112",
  "BT7-111",
  "BT7-112",
  "BT8-111",
  "BT8-112",
  "BT9-111",
  "BT9-112",
  "BT10-111",
  "BT10-112",
  "EX1-073",
  "EX2-073",
  "EX2-074",
] as const;

describe("rarity data across the legacy enum boundary", () => {
  it("contains exactly the 24 official SEC cards in the BT1-BT10/EX1-EX2 cutoff", () => {
    const inCutoff = cardList.filter((card) => /^(BT(?:[1-9]|10)|EX[12])$/.test(card.set) && card.rarity === "SEC");

    expect(inCutoff.map((card) => card.cardId).sort()).toEqual([...HISTORICAL_SECRET_RARES].sort());
    expect(cardList.filter((card) => /^(BT(?:[1-9]|10)|EX[12])$/.test(card.set) && card.rarity === "UR")).toHaveLength(
      0,
    );
  });

  it("classifies every audited P-001 through P-078 card as promo rarity", () => {
    for (let number = 1; number <= 78; number += 1) {
      const cardId = `P-${String(number).padStart(3, "0")}`;
      expect(cardData[cardId]?.rarity, cardId).toBe("P");
    }
  });

  it("preserves modern UR separately from SEC", () => {
    expect(cardData["BT25-043"]?.rarity).toBe("UR");
    expect(cardData["BT25-103"]?.rarity).toBe("SEC");
  });
});
