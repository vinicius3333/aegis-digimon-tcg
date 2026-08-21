import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-081.js";

describe("BT18-081 Rhihimon", () => {
  it("proves the hand-only two-material Tamer digivolution and all printed clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: true, costOverride: 3, ignoreRequirements: true, target: { filter: { kind: ["Tamer"], colors: ["Purple", "Yellow"] } }, additionalCosts: [{ kind: "place", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["KaiserLeomon"], match: "name" }] }, count: 1 } }] }],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { kind: ["Tamer"], hasInheritedEffects: true } } }] });
    expect(compiled.effects[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }] });
  });
});
