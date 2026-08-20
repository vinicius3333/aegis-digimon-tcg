import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-028.js";

describe("BT13-028 Thetismon", () => {
  it("uses the hand digivolution cost 3 and the three-card inherited return cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Main", isFromHand: true, actions: [expect.objectContaining({ kind: "Digivolve", payCost: true, costOverride: 3, ignoreRequirements: true, additionalCosts: [expect.objectContaining({ kind: "place", position: "bottom" })] })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: expect.objectContaining({ kind: "return", target: expect.objectContaining({ count: 3 }) }) })] });
  });
});
