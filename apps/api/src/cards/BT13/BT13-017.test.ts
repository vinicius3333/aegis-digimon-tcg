import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-017.js";

describe("BT13-017 Jesmon", () => {
  it("applies the deletion budget and scaling DP effect", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find(candidate => candidate.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "DeleteByDPBudget", baseBudget: 6000, budgetBonus: { per: 2000, unit: "cards" } });
    }
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000 })] });
  });
});
