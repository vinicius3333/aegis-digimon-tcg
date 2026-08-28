import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-095 Knight Device", () => {
  it("preserves color waiver, same-target Piercing and DP buffs, KB trash duration, and Security suspension", () => {
    const card = runtimeCompiledCard("BT19-095");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHaveNone",
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Knight Device"], match: "name" }] },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            amount: 4000,
            duration: "forTheTurn",
          },
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
            keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
            duration: "forTheTurn",
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "whenTrashedFromBattleArea",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            amount: 4000,
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
            keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 } },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });
});
