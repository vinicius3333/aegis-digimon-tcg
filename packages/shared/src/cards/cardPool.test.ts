import { describe, expect, it } from "vitest";
import { allCards, getCardDefinition } from "./registry.js";
import { isBetaOnlyCard, promoProductCardIds, releaseDateForCard, releaseDateForSet } from "./cardPool.js";

function card(cardId: string) {
  const definition = getCardDefinition(cardId);
  if (!definition) throw new Error(`Missing fixture card ${cardId}`);
  return definition;
}

describe("release dates", () => {
  it("resolves a product date for every non-promo set", () => {
    expect(releaseDateForSet("BT10")).toBe("2022-10-14");
    expect(releaseDateForSet("BT19")).toBe("2025-02-28");
    expect(releaseDateForSet("ZZ")).toBeUndefined();
  });

  it("uses promo release dates instead of treating every P card as one set", () => {
    expect(releaseDateForCard(card("P-077"))).toBe("2022-07-29");
    expect(releaseDateForCard(card("P-078"))).toBe("2022-07-29");
    expect(releaseDateForCard(card("P-082"))).toBe("2024-05-01");
  });

  it("derives the ST11 Special Entry Pack inventory from the promo product mapping", () => {
    expect(promoProductCardIds("ST11 Special Entry Pack")).toEqual(["P-065"]);
  });

  it("flags a card as beta-only exactly while its verified date is still in the future", () => {
    expect(isBetaOnlyCard(card("EX13-001"), "2026-09-11")).toBe(true);
    expect(isBetaOnlyCard(card("EX13-001"), "2026-10-02")).toBe(false);
    expect(isBetaOnlyCard(card("EX13-001"), "2026-10-03")).toBe(false);
    expect(isBetaOnlyCard(card("P-245"), "2026-09-11")).toBe(true);
    expect(isBetaOnlyCard(card("P-245"), "2026-10-01")).toBe(false);
    expect(isBetaOnlyCard(card("BT10-001"), "2022-10-14")).toBe(false);
    expect(isBetaOnlyCard(card("BT10-001"), "2026-09-11")).toBe(false);
  });

  it("has release metadata for every non-token card in the registry", () => {
    const missing = allCards()
      .filter((definition) => !definition.isToken)
      .filter((definition) => releaseDateForCard(definition) === undefined)
      .map((definition) => definition.cardId);

    expect(missing).toEqual([]);
  });
});
