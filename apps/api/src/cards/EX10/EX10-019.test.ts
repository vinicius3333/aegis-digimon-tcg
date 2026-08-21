import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-019.js";

describe("EX10-019 Warudamon", () => {
  it("proves linking sources, same-target unsuspend restriction, and the link effect", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mienumon", "Sakusimon"], cost: 0 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Link", from: ["trash", "digivolutionCards"], optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && effect.frequency === "OncePerTurn")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [
      { kind: "Suspend", optional: true, target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
      { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentNextUnsuspendPhase", target: { sameTarget: true } },
    ] }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && !effect.frequency)).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{ kind: "trashSecurityTop", cost: { kind: "trash", target: { filter: { zone: "linked" }, count: 1 } } }] }] });
  });
});
