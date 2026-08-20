import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-053.js";

describe("BT13-053 Mihiramon", () => {
  it("suspends a target and prevents unsuspension without undoing the suspension", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Suspend" }), expect.objectContaining({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" })] });
  });
});
