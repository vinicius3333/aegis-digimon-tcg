import { describe, it, expect } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import cards from "../../../../../packages/shared/src/cards/data/cards.json" with { type: "json" };
import { canDigivolveOntoWithAlternates, cardHasTrait } from "./cardData.js";

// Every Appmon Lv.4+ prints a SECOND digivolve cost badge gated on the previous form's trait
// with no color ring ("Stnd. 2" beside "Lv.3 2"). That badge is the whole reason Appmon can
// digivolve across colors into each other, and it was missing from the imported card data for
// 42 of the 48 printings. The badge's cost is read off the card, not derived: BT25-052/056/070/072
// price it BELOW their level badge, so a rule of "same as the EvoCost" would be wrong.
const PREVIOUS_FORM: Record<number, string> = { 4: "Stnd.", 5: "Sup.", 6: "Ult.", 7: "God" };

const definitions = cards as unknown as {
  cardId: string;
  level?: number;
  kinds: string[];
  forms?: string[];
  types?: string[];
}[];

const isAppmon = (card: (typeof definitions)[number]) =>
  [...(card.forms ?? []), ...(card.types ?? [])].some((trait) => trait.toLowerCase() === "appmon");

const appmon = definitions.filter((card) => isAppmon(card) && card.kinds.includes("Digimon"));

describe("Appmon previous-form digivolve badge", () => {
  it("gives every Appmon Lv.4+ a requirement on the previous form's trait", () => {
    const withoutBadge = appmon
      .filter((card) => (card.level ?? 0) >= 4)
      .filter((card) => {
        const wanted = PREVIOUS_FORM[card.level!]!;
        return !(digivolutionRequirementsFor(card.cardId) ?? []).some((req) => req.traits?.includes(wanted));
      })
      .map((card) => card.cardId);
    expect(withoutBadge).toEqual([]);
  });

  it("reaches every previous-form Appmon regardless of color", () => {
    // Poseidomon is Blue; Beautymon (its Ult. base pool) spans every color.
    const bases = appmon.filter((card) => card.forms?.includes("Ult.") && card.cardId !== "BT23-024");
    expect(bases.length).toBeGreaterThan(5);
    for (const base of bases) {
      expect({ base: base.cardId, ok: canDigivolveOntoWithAlternates("BT23-024", base.cardId) }).toEqual({
        base: base.cardId,
        ok: true,
      });
    }
  });

  it("prices the badge from the card face, not from the EvoCost", () => {
    // BT25-052 Logimon prints "Lv.3 3" and "Stnd. 2" - the badge is one memory cheaper.
    const logimon = digivolutionRequirementsFor("BT25-052") ?? [];
    expect(logimon).toEqual([{ traits: ["Stnd."], cost: 2, isAlternate: false }]);
    // BT26-086 Dantemon prints ONLY "God 4" and carries no EvoCost at all.
    expect(digivolutionRequirementsFor("BT26-086")).toEqual([{ traits: ["God"], cost: 4, isAlternate: false }]);
  });

  it("keeps the form traits exclusive to Appmon so no other Digimon gains a base", () => {
    const leaked = definitions.filter(
      (card) => !isAppmon(card) && Object.values(PREVIOUS_FORM).some((trait) => cardHasTrait(card.cardId, trait)),
    );
    expect(leaked.map((card) => card.cardId)).toEqual([]);
  });
});
