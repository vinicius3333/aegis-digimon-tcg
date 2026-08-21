import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-007.js";

describe("EX10-007 Greymon", () => {
  it("proves both shared On Play/When Digivolving target scopes and inherited DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Agumon"], cost: 2, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          target: { filter: { kind: ["Digimon"] }, count: 1 },
        }],
      });
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")?.keywords).toEqual([
      { keyword: "Raid", raw: "＜Raid＞" },
    ]);
  });
});
