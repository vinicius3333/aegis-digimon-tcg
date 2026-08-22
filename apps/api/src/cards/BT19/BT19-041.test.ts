import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-041", () => {
  it("preserves security-cost DP and Blocker effects plus low-security leave-play replacement", () => {
    const card = runtimeCompiledCard("BT19-041");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "ModifyDP", amount: 6000, duration: "untilOpponentTurnEnd", cost: { kind: "trash" } },
          { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "ifThisEffectActed" } },
        ],
      })),
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [
              {
                kind: "SecurityManipulation",
                op: "addTop",
                source: "deck",
                condition: { kind: "zoneCount", op: "lte", value: 2 },
              },
            ],
          },
        ],
      },
    ]);
  });
});
