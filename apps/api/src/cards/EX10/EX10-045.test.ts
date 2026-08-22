import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-045.js";

describe("EX10-045 Tuwarmon", () => {
  it("proves Rush/Collision, shared same-target buffs, DigiXros, Save, and scoped inherited Draw 1", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["Damemon"] }, { names: ["ChuuChuumon"] }], count: 2 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "GainKeyword", target: { bindAs: "chosen" }, keyword: { keyword: "Blocker" }, cost: { kind: "trash", target: { from: ["digivolutionCards"] } } },
          { kind: "GainKeyword", target: { fromSelectionRef: "chosen" }, keyword: { keyword: "Retaliation" } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "Static" && effect.isInherited)).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", sourceFilter: { isSelfRef: true }, hostFilter: { controller: "mine", kind: ["Digimon"] }, actions: [{ kind: "Draw", amount: 1 }] }],
    });
  });
});
