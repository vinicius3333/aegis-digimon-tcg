import { describe, expect, it } from "vitest";
import { CardColor, CardKind, allCards } from "@aegis/shared";
import { readableEffectText } from "./CardDetailDrawer";
import {
  COST_FILTERS,
  HIGHEST_COST_FILTER,
  matchesColorFilter,
  matchesCostFilter,
  matchesLevelFilter,
  matchesRarityFilter,
  matchesTraitOrAttributeFilter,
} from "./cardFilters";
import { collectionOrder, sortCards, sortByCollection } from "./cardSorting";

describe("deck-builder color filtering", () => {
  it("requires every selected color for a multicolor deck search", () => {
    const selectedColors = ["Red", "Blue"] as const;

    expect(
      matchesColorFilter({
        cardColors: [CardColor.Red, CardColor.Blue],
        selectedColors,
        mode: "all",
      }),
    ).toBe(true);
    expect(
      matchesColorFilter({
        cardColors: [CardColor.Red],
        selectedColors,
        mode: "all",
      }),
    ).toBe(false);
  });

  it("keeps the collection's any-color filtering behavior", () => {
    expect(
      matchesColorFilter({
        cardColors: [CardColor.Red],
        selectedColors: ["Red", "Blue"],
        mode: "any",
      }),
    ).toBe(true);
  });
});

describe("card level and trait filtering", () => {
  it("matches any selected level and omits cards without a level", () => {
    expect(matchesLevelFilter(4, [3, 4])).toBe(true);
    expect(matchesLevelFilter(5, [3, 4])).toBe(false);
    expect(matchesLevelFilter(undefined, [3, 4])).toBe(false);
    expect(matchesLevelFilter(undefined, [])).toBe(true);
  });

  it("matches exact play costs and keeps the highest chip as an or-more bucket", () => {
    expect(matchesCostFilter(4, [3, 4])).toBe(true);
    expect(matchesCostFilter(5, [3, 4])).toBe(false);
    expect(matchesCostFilter(12, [12])).toBe(true);
    expect(matchesCostFilter(13, [12])).toBe(false);
    expect(matchesCostFilter(10, [7])).toBe(false);
    expect(matchesCostFilter(20, [HIGHEST_COST_FILTER])).toBe(true);
    expect(matchesCostFilter(HIGHEST_COST_FILTER - 1, [HIGHEST_COST_FILTER])).toBe(false);
    expect(matchesCostFilter(-1, [0])).toBe(false);
    expect(matchesCostFilter(-1, [])).toBe(true);
  });

  it("reaches every printed play cost with a cost chip", () => {
    const unreachable = allCards().filter(
      (card) => card.playCost >= 0 && !COST_FILTERS.some((cost) => matchesCostFilter(card.playCost, [cost])),
    );
    expect(unreachable).toEqual([]);
  });

  it("matches printed traits and attributes, but not absent values", () => {
    const card = { types: ["Xros Heart"], attributes: ["Vaccine"] };

    expect(matchesTraitOrAttributeFilter(card, "xros")).toBe(true);
    expect(matchesTraitOrAttributeFilter(card, "VACC")).toBe(true);
    expect(matchesTraitOrAttributeFilter(card, "rookie")).toBe(false);
  });

  it("1555813766040391700: discovers every catalog form as a trait", () => {
    for (const card of allCards()) {
      for (const form of card.forms ?? []) {
        expect(matchesTraitOrAttributeFilter(card, form), `${card.cardId}: ${form}`).toBe(true);
      }
    }
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
    expect(
      readableEffectText("[All Turns] Effects can't trash this card.[When Attacking] Digivolve this Digimon."),
    ).toBe("[All Turns] Effects can't trash this card.\n[When Attacking] Digivolve this Digimon.");
    expect(readableEffectText("[On Play][When Digivolving] Draw 1.")).toBe("[On Play][When Digivolving] Draw 1.");
    expect(
      readableEffectText(
        "Digivolve from [Alphamon] with an [Ouryumon] digivolution card[When Digivolving] Delete all.[End of Your Turn][Once Per Turn] Return cards.",
      ),
    ).toBe(
      "Digivolve from [Alphamon] with an [Ouryumon] digivolution card\n[When Digivolving] Delete all.\n[End of Your Turn][Once Per Turn] Return cards.",
    );
    expect(readableEffectText("Digivolve: 0 from [Jesmon]＜Piercing＞[When Digivolving] Play 1 [Sistermon].")).toBe(
      "Digivolve: 0 from [Jesmon]\n＜Piercing＞\n[When Digivolving] Play 1 [Sistermon].",
    );
  });
});

describe("collection chronology", () => {
  it("places EX13 after the latest dated expansion instead of the unknown-set tail", () => {
    const cards = [
      { cardId: "P-250", set: "P" },
      { cardId: "EX12-001", set: "EX12" },
      { cardId: "EX13-001", set: "EX13" },
      { cardId: "BT25-001", set: "BT25" },
    ] as never[];

    expect(sortByCollection(cards).map(({ cardId }) => cardId)).toEqual(["EX13-001", "EX12-001", "BT25-001", "P-250"]);
  });

  it("orders every dated set newest first and keeps promos and limited cards last", () => {
    const cards = ["P-250", "LM-001", "BT25-001", "ST9-01", "BT26-001", "ST10-01", "EX14-012", "SD01-02"].map(
      (cardId) => ({ cardId, set: cardId.split("-")[0] }),
    ) as never[];

    expect(sortByCollection(cards).map(({ cardId }) => cardId)).toEqual([
      "EX14-012",
      "SD01-02",
      "BT26-001",
      "BT25-001",
      "ST10-01",
      "ST9-01",
      "LM-001",
      "P-250",
    ]);
  });

  it("places the app-only BD sets ahead of every dated set, newest pack first", () => {
    const cards = ["EX14-012", "BD01-02", "P-250", "BD02-03"].map((cardId) => ({
      cardId,
      set: cardId.split("-")[0],
    })) as never[];

    expect(sortByCollection(cards).map(({ cardId }) => cardId)).toEqual(["BD02-03", "BD01-02", "EX14-012", "P-250"]);
  });

  it("gives every catalog set a collection position", () => {
    const sets = new Set(allCards().map(({ set }) => set));
    sets.delete("TOKEN");

    expect([...sets].filter((set) => collectionOrder(set) === 999999)).toEqual([]);
  });
});
