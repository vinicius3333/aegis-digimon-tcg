import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-052.js";

describe("EX10-052 Lucemon: Chaos Mode", () => {
  it("proves hand-trash opponent choice, conditional Recovery, leave replacement, and alternate evolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Lucemon"], cost: 5, isAlternate: true }]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Delete", controller: "opponent", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 }, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } }, optional: true, abortOnDecline: true },
          { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1, condition: { kind: "ifThisEffectDidNotDelete" } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Replacement", event: "wouldLeavePlay", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Delete", controller: "opponent", optional: true }] },
        { kind: "Prevent", mode: "leavePlay", condition: { kind: "ifThisEffectDidNotDelete" } },
      ],
    });
  });
});
