import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-073.js";

describe("BT19-073", () => {
  it("preserves Collision/Piercing, scaled de-digivolve lock, and Knightmon Alliance DP grant", () => {
    const card = runtimeCompiledCard("BT19-073");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Collision" }] },
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, bindAs: "deDigivolveTarget" },
            scaling: { per: 1, unit: "cards" },
          },
          {
            kind: "Restrict",
            target: { fromSelectionRef: "deDigivolveTarget" },
            restriction: "digivolve",
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Alliance" }, duration: "permanent" },
          { kind: "ModifyDP", amount: 3000, duration: "permanent" },
        ],
      },
    ]);
  });
});
