import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-034.js";

describe("BT13-034 Kudamon", () => {
  it("reveals three cards, adds the two yellow categories, and bottoms the rest", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: expect.arrayContaining([expect.objectContaining({ count: 1, to: "hand" })]) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "ModifyDP", amount: -2000, condition: expect.objectContaining({ kind: "totalSecurityCount", value: 6 }) })] });
  });
});
