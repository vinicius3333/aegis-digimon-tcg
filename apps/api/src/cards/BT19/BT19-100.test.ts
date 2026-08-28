import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-100 D-Reaper Zone", () => {
  it("preserves conditional security placement, scaled attack reduction, and mandatory Security play", () => {
    const card = runtimeCompiledCard("BT19-100");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isSecurity: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            fireCondition: { kind: "allYoursMatchFilter" },
            actions: [
              {
                kind: "ModifyDP",
                amount: -1000,
                duration: "forTheTurn",
                scaling: { per: 1, unit: "digivolutionCardsOfFiltered" },
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTop",
            faceUp: true,
            condition: { kind: "youHaveNone" },
            cost: { kind: "trash" },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            condition: { kind: "triggerPlayCostAtMostStackCount" },
            scaling: { per: 1, unit: "digivolutionCardsOfFiltered" },
          },
        ],
      },
    ]);
  });
});
