import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-055.js";

describe("EX10-055 Tactimon", () => {
  it("proves level-relative sacrifice/delete, all-target Bagra Army replacement, and DigiXros", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ desc: "[Bagra Army] Digimon" }], count: 2 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        optional: true,
        actions: [
          { kind: "SelectBind", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "A" } },
          { kind: "Delete", target: { fromSelectionRef: "A" } },
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], relativeTo: { attr: "level", op: "lte", selectionRef: "A" } }, count: 1 } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", affectsAll: true, leaveCause: "byEffect", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" }, cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 } } }],
    });
  });
});
