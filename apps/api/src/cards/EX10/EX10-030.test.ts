import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-030.js";

describe("EX10-030 Cometmon", () => {
  it("proves both link sources, linked attack return cost, link-trash debuff, and leave replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Warpmon", "Weatherdramon"], cost: 0 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Link", from: ["hand", "digivolutionCards"], optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({ isLinked: true, actions: [{ kind: "Return", optional: true, abortOnDecline: true, target: { filter: { controller: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Appmon"] }] }, count: 1 }, cost: { kind: "trash", target: { filter: { zone: "linked" }, count: 1 } } }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinkTrashed", actions: [{ kind: "ModifyDP", amount: -8000, duration: "forTheTurn" }] }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "Prevent", cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 } } }] }] });
  });
});
