import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-039.js";

describe("BT13-039 KnightChessmon", () => {
  it("keeps the Chessmon evolution requirement and conditional deletion play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 3, names: ["Chessmon"], cost: 2 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, condition: expect.objectContaining({ kind: "isYourTurn" }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Reboot" })] });
  });
});
