import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-015 WarGrowlmon", () => {
  it("preserves mandatory deletion, failed-delete Piercing/DP fallback, and once-per-turn memory", () => {
    const card = runtimeCompiledCard("BT19-015");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            mandatory: true,
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            duration: "untilOpponentTurnEnd",
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      },
      {
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "GainMemory", amount: 2 }] }],
      },
    ]);
  });
});
