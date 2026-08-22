import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-018.js";

describe("EX10-018 Astamon", () => {
  it("verifies both Save-text evolution routes and under-Tamer play source", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Psychemon"], cost: 5, isAlternate: true },
      { level: 4, texts: ["Save"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{
        kind: "PlayWithoutCost", from: ["underMyTamers"], payCost: false, optional: true,
        target: { filter: { controller: "mine", playCostLte: 4, keywords: ["Save"] }, count: 1 },
      }] });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Piercing" }] });
  });
});
