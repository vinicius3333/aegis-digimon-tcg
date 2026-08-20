import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-068.js";

describe("BT13-068 KnightChessmon", () => {
  it("keeps Blocker, evolution cost 2, and opponent-turn Chessmon play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 3, names: ["Chessmon"], cost: 2 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", condition: expect.objectContaining({ kind: "isOpponentsTurn" }), optional: true })] });
  });
});
