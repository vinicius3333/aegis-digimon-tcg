import { CardColor, CardKind, type CardDefinition, type DigiXrosMaterial } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { materialsSatisfyRecipe } from "./actions/digiXros.js";

function definition({
  kinds = [CardKind.Digimon],
  forms,
  attributes,
  types,
}: {
  kinds?: CardKind[];
  forms?: string[];
  attributes?: string[];
  types?: string[];
}): CardDefinition {
  return {
    cardId: "TEST-001",
    set: "TEST",
    nameEn: "Testmon",
    kinds,
    colors: [CardColor.Red],
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    forms,
    attributes,
    types,
    maxCountInDeck: 4,
  };
}

describe("DigiXros traitContains", () => {
  const recipe: DigiXrosMaterial[] = [{ traitContains: ["Dragon", "saur", "Ceratopsian"] }];

  it("matches substrings only in printed traits, not forms or attributes", () => {
    expect(materialsSatisfyRecipe([definition({ types: ["Rock Dragon"] })], recipe)).toBe(true);
    expect(materialsSatisfyRecipe([definition({ types: ["Dinosaur"] })], recipe)).toBe(true);
    expect(materialsSatisfyRecipe([definition({ types: ["Dragonkin"] })], recipe)).toBe(true);
    expect(materialsSatisfyRecipe([definition({ forms: ["Dragonkin"], types: ["Reptile"] })], recipe)).toBe(false);
    expect(materialsSatisfyRecipe([definition({ attributes: ["Dragon"] as never, types: ["Reptile"] })], recipe)).toBe(
      false,
    );
  });

  it("rejects non-Digimon even when their trait contains Dragon", () => {
    expect(
      materialsSatisfyRecipe([definition({ kinds: [CardKind.Option], types: ["Four Great Dragons"] })], recipe),
    ).toBe(false);
  });
});
