import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-072 LordKnightmon", () => {
  it("preserves both trash revival triggers and once-per-turn Royal Knight attack redirection", () => {
    const card = runtimeCompiledCard("BT19-072");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        }],
      })),
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [{
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{
            kind: "RedirectAttack",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
              },
              count: 1,
            },
            optional: true,
          }],
        }],
      },
    ]);
  });
});
