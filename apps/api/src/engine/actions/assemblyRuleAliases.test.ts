import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, getCardDefinition } from "@aegis/shared";
import { materialsSatisfyAssemblyRecipe } from "./assembly.js";

describe("Assembly materials with Rule aliases", () => {
  it("accepts EX5-046 Targetmon's [Rule] [Sukamon] name for EX13-031", () => {
    const recipe = assemblyRequirementFor("EX13-031")![0]!.materials;
    const targetmon = getCardDefinition("EX5-046")!;
    expect(materialsSatisfyAssemblyRecipe([targetmon, targetmon, targetmon], recipe)).toBe(true);
  });
});
