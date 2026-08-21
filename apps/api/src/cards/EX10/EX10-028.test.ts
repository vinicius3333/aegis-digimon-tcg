import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-028.js";

describe("EX10-028 Landramon", () => {
  it("proves shared-target buffs paid by a Mineral/Rock digivolution-card trash", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "GainKeyword", selectionRef: "chosen", keyword: { keyword: "Reboot" }, cost: { kind: "trash", target: { from: ["digivolutionCards"], count: 1, filter: { controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] } } } },
        { kind: "GainKeyword", target: { fromSelectionRef: "chosen" }, keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
        { kind: "ModifyDP", target: { fromSelectionRef: "chosen" }, amount: 3000, duration: "untilOpponentTurnEnd" },
      ] });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ actions: [{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] }, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 } }] }] });
  });
});
