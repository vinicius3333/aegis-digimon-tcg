import { describe, expect, it } from "vitest";
import { allCards, getCardDefinition } from "./registry.js";
import {
  CARD_POOL_CUTOFF_DATE,
  activeProductLabels,
  activePromoCount,
  activePromoRanges,
  cardPoolLabel,
  isCardInActivePool,
  releaseDateForCard,
} from "./cardPool.js";

function card(cardId: string) {
  const definition = getCardDefinition(cardId);
  if (!definition) throw new Error(`Missing fixture card ${cardId}`);
  return definition;
}

describe("active card pool", () => {
  it("starts with the verified BT19/BT20 release date as its single configurable cutoff", () => {
    expect(CARD_POOL_CUTOFF_DATE).toBe("2025-02-28");
    expect(cardPoolLabel()).toBe("BT19");
  });

  it("includes products released through BT19 and excludes later products", () => {
    expect(isCardInActivePool(card("BT10-001"))).toBe(true);
    expect(isCardInActivePool(card("ST13-01"))).toBe(true);
    expect(isCardInActivePool(card("BT19-001"))).toBe(true);
    expect(isCardInActivePool(card("BT20-001"))).toBe(true);
    expect(isCardInActivePool(card("EX9-001"))).toBe(false);
    expect(isCardInActivePool(card("BT21-001"))).toBe(false);
  });

  it("lists the released products in release order", () => {
    const products = activeProductLabels();
    expect(products[0]).toBe("ST1");
    // BT19 and BT20 share the Special Booster Ver.2.5 date; ordering is stable by label.
    expect(products.slice(-2)).toEqual(["BT19", "BT20"]);
    expect(products).not.toContain("EX9");
  });

  it("collapses the released promos into contiguous ranges", () => {
    expect(activePromoRanges("2022-10-14")).toEqual(["P-001–P-065", "P-072–P-078"]);
    expect(activePromoCount("2022-10-14")).toBe(72);
  });

  it("uses promo release dates instead of treating every P card as one set", () => {
    expect(releaseDateForCard(card("P-077"))).toBe("2022-07-29");
    expect(isCardInActivePool(card("P-077"), "2022-10-14")).toBe(true);
    expect(releaseDateForCard(card("P-078"))).toBe("2022-07-29");
    expect(isCardInActivePool(card("P-078"), "2022-10-14")).toBe(true);
    expect(isCardInActivePool(card("P-082"), "2022-10-14")).toBe(false);
  });

  it("can advance the pool with only a new cutoff date", () => {
    expect(isCardInActivePool(card("BT13-001"), "2023-07-21")).toBe(true);
    expect(isCardInActivePool(card("EX4-001"), "2023-07-21")).toBe(true);
  });

  it("keeps products without release metadata locked", () => {
    expect(isCardInActivePool({ cardId: "ZZ-001", set: "ZZ" })).toBe(false);
  });

  it("has release metadata for every non-token card in the registry", () => {
    const missing = allCards()
      .filter((definition) => !definition.isToken)
      .filter((definition) => releaseDateForCard(definition) === undefined)
      .map((definition) => definition.cardId);

    expect(missing).toEqual([]);
  });
});
