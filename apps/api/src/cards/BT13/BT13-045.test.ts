import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-045.js";

describe("BT13-045 KingChessmon", () => {
  it("reduces its play cost at eight Chessmon in trash and deletes another Digimon to play one", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldBePlayed" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, abortOnDecline: true, cost: expect.objectContaining({ kind: "deleteOwn" }) })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlayWithoutCost", target: expect.objectContaining({ filter: expect.objectContaining({ excludeNames: ["KingChessmon"] }) }) })] });
  });
});
