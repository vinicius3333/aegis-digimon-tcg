import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-016.js";

describe("EX10-016 Mirrormon", () => {
  it("models the linked attack cost and both printed suspend effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({ isLinked: true, actions: [{
      kind: "Suspend", optional: true, abortOnDecline: true,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
      cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"], zone: "linked" }, count: 1 } },
    }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "Suspend", optional: true, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] }] });
  });
});
