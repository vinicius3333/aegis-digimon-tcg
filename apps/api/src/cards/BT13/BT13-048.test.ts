import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-048.js";

describe("BT13-048 Salamon", () => {
  it("searches the two printed trait groups and applies the inherited DP condition", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: expect.arrayContaining([expect.objectContaining({ count: 1 }), expect.objectContaining({ count: 1 })]) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 } })] });
  });
});
