import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-012.js";

describe("BT13-012 GeoGreymon", () => {
  it("implements security search, conditional recovery, shuffle, and inherited deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "WhenDigivolving", actions: expect.arrayContaining([
        expect.objectContaining({ kind: "PlayWithoutCost", from: ["security"], payCost: false, optional: true }),
        expect.objectContaining({ kind: "SecurityManipulation", op: "addTop", condition: { kind: "ifThisEffectActed" } }),
        expect.objectContaining({ kind: "SecurityManipulation", op: "shuffle", source: "security" }),
      ]) }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger" })] }),
    ]));
  });
});
