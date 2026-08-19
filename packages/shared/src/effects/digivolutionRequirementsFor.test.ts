import { describe, it, expect } from "vitest";
import cards from "../cards/data/cards.json" with { type: "json" };
import { digivolutionRequirementsFor } from "./data.js";

// Regression for the corresponding regression coverage finding 1: BT26 is hand-implemented
// and has no effects.json entry, so its printed `[Digivolve] ...: Cost N` alternate paths only
// exist via ALTERNATE_DIGIVOLUTION_OVERRIDES or the generated fallback map. Every BT26 card that
// prints such a header must resolve to a non-empty requirement list.
describe("digivolutionRequirementsFor / BT26 alternate digivolve coverage", () => {
  const bt26WithHeader = (cards as Array<{ cardId: string; set: string; effectText?: string }>).filter(
    (c) => c.set === "BT26" && /\[Digivolve\]/.test(c.effectText ?? ""),
  );

  it("finds the expected number of BT26 cards printing a [Digivolve] header", () => {
    expect(bt26WithHeader.length).toBe(76);
  });

  it.each(bt26WithHeader.map((c) => c.cardId))("%s resolves a non-empty alternate requirement", (cardId) => {
    const reqs = digivolutionRequirementsFor(cardId);
    expect(reqs).toBeDefined();
    expect(reqs!.length).toBeGreaterThan(0);
  });

  it("BT26-032 (Ceresmon) carries the base-play-cost gate, not just a name gate", () => {
    const reqs = digivolutionRequirementsFor("BT26-032");
    expect(reqs).toEqual([{ names: ["Ceresmon"], basePlayCost: 12, cost: 2, isAlternate: true }]);
  });

  it("BT26-050 (Rosemon) keeps its hand-curated Burst Digivolve addition alongside the generated trait alternate", () => {
    const reqs = digivolutionRequirementsFor("BT26-050");
    expect(reqs).toEqual([
      { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
      { cost: 0, isAlternate: true, names: ["Rosemon"], burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] } },
    ]);
  });
});
