// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardColor, CardKind, allCards, type CardDefinition } from "@aegis/shared";
import { sortSearchResults, useCardFilter } from "./cardFilters";

function searchIds(cards: readonly CardDefinition[], query: string): string[] {
  const { result } = renderHook(() => useCardFilter(cards));
  act(() => result.current.setQuery(query));
  return result.current.filtered.map((card) => card.cardId);
}

function testCard(cardId: string, nameEn: string, text: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...text,
  };
}

describe("card search box", () => {
  it("finds cards by their effect text, ignoring trait brackets (Discord 1557071980103213056)", () => {
    const gotsumon = allCards().find((candidate) => candidate.cardId === "EX13-047");
    expect(gotsumon?.effectText).toContain("[Royal Knight]");

    expect(searchIds([gotsumon!], "Royal Knight")).toEqual(["EX13-047"]);
    expect(searchIds([gotsumon!], "[royal knight]")).toEqual(["EX13-047"]);
  });

  it("searches inherited, security, and option text, and full-width keyword brackets", () => {
    const cards = [
      testCard("BT1-001", "Inheritor", { inheritedEffectText: "[Your Turn] This Digimon gets +1000 DP." }),
      testCard("BT1-002", "Guard", { effectText: "＜Blocker＞" }),
      testCard("BT1-003", "Trigger", { securityEffectText: "[Security] Activate this card's [Main] effect." }),
      testCard("BT1-004", "Dual", { optionEffect: "[Main] Delete 1 of your opponent's Digimon." }),
    ];

    expect(searchIds(cards, "+1000 dp")).toEqual(["BT1-001"]);
    expect(searchIds(cards, "<blocker>")).toEqual(["BT1-002"]);
    expect(searchIds(cards, "security")).toEqual(["BT1-003"]);
    expect(searchIds(cards, "delete 1")).toEqual(["BT1-004"]);
  });

  it("keeps name and card number matches ahead of text-only matches", () => {
    const cards = [
      testCard("BT1-010", "Greymon", { effectText: "Digivolve into a card with [Agumon] in its name." }),
      testCard("BT1-011", "Agumon"),
      testCard("BT1-012", "Gabumon"),
    ];

    expect(searchIds(cards, "agumon")).toEqual(["BT1-011", "BT1-010"]);
    expect(searchIds(cards, "bt1-012")).toEqual(["BT1-012"]);
    expect(
      sortSearchResults({ cards: [cards[0]!, cards[1]!], sort: "name", query: "agumon" }).map((c) => c.nameEn),
    ).toEqual(["Agumon", "Greymon"]);
  });
});
