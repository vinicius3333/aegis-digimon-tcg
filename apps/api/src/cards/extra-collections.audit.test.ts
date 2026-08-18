import { describe, expect, it } from "vitest";
import { allCards } from "@aegis/shared";
import { getEffectModule } from "../engine/effects/registry.js";
import "./EX5/index.js";
import "./EX6/index.js";
import "./EX7/index.js";
import "./EX8/index.js";

/**
 * Catalog/module parity audit for the four extra collections in the current
 * release window. The individual card files remain the behavioral source of
 * truth; this guard prevents a card from silently disappearing from the
 * runtime registry while its catalog entry remains present.
 */
describe("EX5–EX8 card-by-card implementation registration", () => {
  it("registers every catalog card with its printed definition", () => {
    const cards = allCards().filter((card) => /^(EX5|EX6|EX7|EX8)-\d+$/.test(card.cardId));
    expect(cards).toHaveLength(296);

    const missing = cards
      .filter((card) => getEffectModule(card.cardId) === undefined)
      .map((card) => card.cardId);
    expect(missing).toEqual([]);

    expect(cards.every((card) => card.nameEn.trim().length > 0)).toBe(true);
  });
});
