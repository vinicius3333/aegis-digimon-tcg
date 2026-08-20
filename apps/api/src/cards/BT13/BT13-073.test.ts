import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-073.js";

describe("BT13-073 QueenChessmon", () => {
  it("keeps Blocker, Chessmon evolution cost 3, and deletion-triggered unsuspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 5, names: ["Chessmon"], cost: 3 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "SubTrigger", event: "onDeletionOf" })] });
  });
});
