import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-011 WarGrowlmon", () => {
  it("preserves Blast Digivolve, shared DP deletion budget, memory scaling, and inherited budget", () => {
    const card = runtimeCompiledCard("BT19-011");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "DeleteByDPBudget",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
            baseBudget: 3000,
            budgetBonus: { per: 2000, unit: "cards" },
          },
          { kind: "GainMemory", amount: 1, scaling: { per: 1, unit: "cards" } },
        ],
      })),
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          {
            kind: "AddToDPDeleteBudget",
            amount: 3000,
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      },
    ]);
  });
});
