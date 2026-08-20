import { describe, expect, it } from "vitest";
import { allCards, getCardDefinition } from "./registry.js";
import { releaseDateForCard, releaseDateForSet } from "./cardPool.js";

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

  it("has release metadata for every non-token card in the registry", () => {
    const missing = allCards()
      .filter((definition) => !definition.isToken)
      .filter((definition) => releaseDateForCard(definition) === undefined)
      .map((definition) => definition.cardId);

    expect(missing).toEqual([]);
  });
});
