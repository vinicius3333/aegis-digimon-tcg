import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-081.js";

describe("BT26-081 compiled behavior", () => {
  it("proves both evolution paths, Assembly, the cost-8 Iliad play budget, and scaled DP reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Minervamon"], cost: 2, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 5, materials: [{ names: ["Minervamon"], count: 1 }] }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "PlayMultiple", from: ["hand", "trash"], payCost: false, totalCost: 8, filter: { nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] } },
        { kind: "ModifyDP", amount: -4000, duration: "untilOpponentTurnEnd", scaling: { per: 1, unit: "cards", filter: { nameOrTrait: [{ tokens: ["Iliad", "TS"], match: "trait" }] } } },
      ] });
    }
  });

  it("grants all four printed continuous effects only to Iliad Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Alliance" }, target: { count: "all" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Reboot" }, target: { count: "all" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { count: "all" } }),
      expect.objectContaining({ kind: "ModifyDP", amount: 2000, target: { count: "all" } }),
    ]);
  });
});
