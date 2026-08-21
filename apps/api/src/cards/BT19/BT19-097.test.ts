import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-097 Bonds of True Love", () => {
  it("preserves direct deck-trash placement, Main mill placement, gated Delay, and Security placement", () => {
    const card = runtimeCompiledCard("BT19-097");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [{
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "PlaceInBattleAreaSelf" }],
          optional: true,
        }],
      },
      {
        trigger: "Main",
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "StartOfYourTurn",
        condition: {
          kind: "youHaveNone",
          filter: { controllerDefault: "mine", kind: ["Digimon"] },
        },
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Impmon"], match: "name" }] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        }],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      },
    ]);
  });
});
