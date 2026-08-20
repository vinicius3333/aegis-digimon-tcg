import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-064.js";

describe("BT13-064 PawnChessmon", () => {
  it("keeps Blocker, opponent-turn restriction, and the eight-card level ceiling", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", keywords: [expect.objectContaining({ keyword: "Blocker" })], actions: [expect.objectContaining({ kind: "PlayWithoutCost", condition: expect.objectContaining({ kind: "isOpponentsTurn" }) }), expect.objectContaining({ kind: "CostModifier", mode: "raiseCeiling", amount: 2 })] });
  });
});
