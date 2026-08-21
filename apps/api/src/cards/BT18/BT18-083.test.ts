import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-083.js";

describe("BT18-083 LordKnightmon", () => {
  it("covers Blast Digivolve, Knightmon-text play, and DP-relative Collision", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true, target: { filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GainKeyword", keyword: { keyword: "Collision" }, duration: "permanent", target: { filter: { dp: { op: "lte", relativeToSource: true } }, count: "all" } }] });
  });
});
