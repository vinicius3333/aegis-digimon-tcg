import { describe, expect, it } from "vitest";
import { compiled as BT24_059 } from "./BT24-059.js";

describe("BT24-059 Sharkmon", () => {
  it("makes the inherited placement-and-unsuspend effect mandatory", () => {
    const inherited = BT24_059.effects?.find((entry) => entry.isInherited);
    const action = inherited?.actions?.[0] as any;
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(action).toMatchObject({ kind: "Unsuspend", target: { filter: { isSelfRef: true } } });
    expect(action.optional).toBeUndefined();
    expect(action.abortOnDecline).toBeUndefined();
    expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
  });
});
