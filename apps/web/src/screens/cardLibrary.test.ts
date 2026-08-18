import { describe, expect, it } from "vitest";
import { CardColor, CardKind } from "@aegis/shared";
import { matchesColorFilter, matchesCostFilter, matchesLevelFilter, matchesRarityFilter, matchesTraitOrAttributeFilter, readableEffectText, sortCards } from "./cardLibrary";

describe("deck-builder color filtering", () => {
  it("requires every selected color for a multicolor deck search", () => {
    const selectedColors = ["Red", "Blue"] as const;

    expect(matchesColorFilter({
      cardColors: [CardColor.Red, CardColor.Blue],
      selectedColors,
      mode: "all",
    })).toBe(true);
    expect(matchesColorFilter({
      cardColors: [CardColor.Red],
      selectedColors,
      mode: "all",
    })).toBe(false);
  });

  it("keeps the collection's any-color filtering behavior", () => {
    expect(matchesColorFilter({
      cardColors: [CardColor.Red],
      selectedColors: ["Red", "Blue"],
      mode: "any",
    })).toBe(true);
  });
});

describe("card level and trait filtering", () => {
  it("matches any selected level and omits cards without a level", () => {
    expect(matchesLevelFilter(4, [3, 4])).toBe(true);
    expect(matchesLevelFilter(5, [3, 4])).toBe(false);
    expect(matchesLevelFilter(undefined, [3, 4])).toBe(false);
    expect(matchesLevelFilter(undefined, [])).toBe(true);
  });

  it("matches selected play costs and keeps seven as a high-cost bucket", () => {
    expect(matchesCostFilter(4, [3, 4])).toBe(true);
    expect(matchesCostFilter(5, [3, 4])).toBe(false);
    expect(matchesCostFilter(10, [7])).toBe(true);
    expect(matchesCostFilter(-1, [0])).toBe(false);
    expect(matchesCostFilter(-1, [])).toBe(true);
  });

  it("matches traits and attributes, but nothing else", () => {
    const card = { types: ["Xros Heart"], attributes: ["Vaccine"] };

    expect(matchesTraitOrAttributeFilter(card, "xros")).toBe(true);
    expect(matchesTraitOrAttributeFilter(card, "VACC")).toBe(true);
    expect(matchesTraitOrAttributeFilter(card, "rookie")).toBe(false);
  });

  it("matches the selected rarity exactly", () => {
    expect(matchesRarityFilter("SR", ["R", "SR"])).toBe(true);
    expect(matchesRarityFilter("C", ["R", "SR"])).toBe(false);
    expect(matchesRarityFilter("P", ["SEC"])).toBe(false);
    expect(matchesRarityFilter("SEC", ["UR"])).toBe(false);
    expect(matchesRarityFilter(undefined, [])).toBe(true);
  });

  it("sorts the card pool by each requested card property", () => {
    const cards = [
      { cardId: "BT1-010", nameEn: "Beta", dp: 1000, level: 4, playCost: 3, kinds: [CardKind.Digimon] },
      { cardId: "BT1-002", nameEn: "Alpha", dp: 3000, level: 3, playCost: 2, kinds: [CardKind.Option] },
    ] as never[];

    expect(sortCards(cards, "name").map((card) => card.nameEn)).toEqual(["Alpha", "Beta"]);
    expect(sortCards(cards, "dp").map((card) => card.dp)).toEqual([1000, 3000]);
    expect(sortCards(cards, "level").map((card) => card.level)).toEqual([3, 4]);
    expect(sortCards(cards, "playCost").map((card) => card.playCost)).toEqual([2, 3]);
    expect(sortCards(cards, "type").map((card) => card.nameEn)).toEqual(["Beta", "Alpha"]);
    expect(sortCards(cards, "cardNumber").map((card) => card.cardId)).toEqual(["BT1-002", "BT1-010"]);
  });
});

describe("card effect readability", () => {
  it("separates punctuation-joined clauses without splitting shared timing headers", () => {
    expect(readableEffectText(
      "[All Turns] Effects can't trash this card.[When Attacking] Digivolve this Digimon.",
    )).toBe(
      "[All Turns] Effects can't trash this card.\n[When Attacking] Digivolve this Digimon.",
    );
    expect(readableEffectText("[On Play][When Digivolving] Draw 1.")).toBe(
      "[On Play][When Digivolving] Draw 1.",
    );
    expect(readableEffectText(
      "Digivolve from [Alphamon] with an [Ouryumon] digivolution card[When Digivolving] Delete all.[End of Your Turn][Once Per Turn] Return cards.",
    )).toBe(
      "Digivolve from [Alphamon] with an [Ouryumon] digivolution card\n[When Digivolving] Delete all.\n[End of Your Turn][Once Per Turn] Return cards.",
    );
    expect(readableEffectText(
      "Digivolve: 0 from [Jesmon]＜Piercing＞[When Digivolving] Play 1 [Sistermon].",
    )).toBe(
      "Digivolve: 0 from [Jesmon]\n＜Piercing＞\n[When Digivolving] Play 1 [Sistermon].",
    );
  });
});
