import { getCardDefinition, type AssemblyMaterial } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { materialsSatisfyAssemblyRecipe } from "./assembly.js";

const material = (cardId: string) => getCardDefinition(cardId)!;
const recipe = (colors?: AssemblyMaterial["colors"]): AssemblyMaterial[] => [
  {
    count: 5,
    kinds: ["Digimon"],
    colors,
    nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }],
  },
];

describe("Assembly material colors", () => {
  it("accepts a multicolor material carrying the required green or black", () => {
    const cards = Array.from({ length: 5 }, () => material("EX11-027"));
    expect(material("EX11-027").colors).toEqual(["Green", "Black"]);
    expect(materialsSatisfyAssemblyRecipe(cards, recipe(["Green"]))).toBe(true);
    expect(materialsSatisfyAssemblyRecipe(cards, recipe(["Black"]))).toBe(true);
  });

  it.each([
    ["Green", "EX11-040"],
    ["Black", "EX11-029"],
  ] as const)("rejects a text-matching %s recipe containing the opposite color (%s)", (color, wrongColor) => {
    const cards = [material(wrongColor), ...Array.from({ length: 4 }, () => material("EX11-027"))];
    expect(materialsSatisfyAssemblyRecipe(cards, recipe())).toBe(true);
    expect(materialsSatisfyAssemblyRecipe(cards, recipe([color]))).toBe(false);
  });

  it("keeps the exact material count alongside color restrictions", () => {
    const cards = Array.from({ length: 4 }, () => material("EX11-027"));
    expect(materialsSatisfyAssemblyRecipe(cards, recipe(["Green"]))).toBe(false);
  });
});
