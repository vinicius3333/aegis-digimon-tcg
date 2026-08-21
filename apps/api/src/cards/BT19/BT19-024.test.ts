import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-024 Jellymon", () => {
  it("preserves Decode replacement, Aqua/Sea Animal placement, and inherited stack play", () => {
    const card = runtimeCompiledCard("BT19-024");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Decode" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "PlaceUnder",
            target: {
              from: ["hand"],
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
              },
            },
            underFilter: { controller: "mine", kind: ["Digimon"] },
            position: "bottom",
            optional: true,
          },
        ],
      })),
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }] },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [
              {
                kind: "PlayWithoutCost",
                from: ["digivolutionCards"],
                payCost: false,
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Blue"],
                    levelComparison: { op: "eq", value: 4 },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        trigger: "EndOfAttack",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }],
      },
    ]);
  });
});
