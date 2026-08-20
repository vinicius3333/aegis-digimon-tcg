import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-035.js";

describe("BT13-035 PawnChessmon", () => {
  it("plays Chessmon conditionally and raises the level ceiling by two at eight trash cards", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, condition: expect.objectContaining({ kind: "isYourTurn" }) }), expect.objectContaining({ kind: "CostModifier", mode: "raiseCeiling", costType: "level", amount: 2, condition: expect.objectContaining({ kind: "youHave", count: 8 }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Reboot" })] });
  });
});
