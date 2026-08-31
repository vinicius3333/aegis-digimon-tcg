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
            fireCondition: {
              kind: "allYoursMatchFilter",
              filter: {
                kind: ["Digimon", "Tamer"],
                nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
              },
            },
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
            target: {
              filter: {
                controller: "mine",
                playCostLte: 0,
                playCostLteScaling: {
                  per: 1,
                  filter: {
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
                  },
                  unit: "digivolutionCardsOfFiltered",
                },
                nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
              },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
          },
        ],
      },
    ]);
  });
});
