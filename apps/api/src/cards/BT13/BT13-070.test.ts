import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-070.js";

describe("BT13-070 RookChessmon", () => {
  it("keeps Blocker, evolution cost 3, and opponent-turn level-5 play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 4, names: ["Chessmon"], cost: 3 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", condition: expect.objectContaining({ kind: "isOpponentsTurn" }), optional: true })] });
  });
});
