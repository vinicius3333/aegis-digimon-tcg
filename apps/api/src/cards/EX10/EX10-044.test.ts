import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-044.js";

describe("EX10-044 Damemon", () => {
  it("proves Bagra Army placement, Tuwarmon Save, and host/card-scoped inherited Draw 1", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "Draw", amount: 1, cost: { kind: "place", target: { from: ["hand", "trash"] }, underFilter: { kind: ["Tamer"] } } }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["underTamers"], payCost: false, optional: true },
        { kind: "PlaceUnder", underFilter: { kind: ["Tamer"] } },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [{
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        hostFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
        actions: [{ kind: "Draw", amount: 1 }],
      }],
    });
  });
});
