import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { materialsSatisfyAssemblyRecipe } from "./assembly.js";

describe("SkullGreymon Assembly level scope", () => {
  it("adds level four without removing level five specifically for Kimeramon", () => {
    const skull = getCardDefinition("EX9-062")!;
    const kimeramon = getCardDefinition("EX9-074")!;
    for (const level of [4, 5]) {
      expect(materialsSatisfyAssemblyRecipe([skull], [{ count: 1, traits: ["DM"], level }], kimeramon)).toBe(true);
    }
    expect(
      materialsSatisfyAssemblyRecipe([skull], [{ count: 1, traits: ["DM"], level: 4 }], getCardDefinition("EX9-055")!),
    ).toBe(false);
  });
  it("retains printed level five for an Assembly recipe without Kimeramon", () => {
    const skull = getCardDefinition("EX9-062")!;
    expect(materialsSatisfyAssemblyRecipe([skull], [{ count: 1, traits: ["DM"], level: 5 }])).toBe(true);
    expect(materialsSatisfyAssemblyRecipe([skull], [{ count: 1, traits: ["DM"], level: 4 }])).toBe(false);
    expect(skull.level).toBe(5);
  });
});
