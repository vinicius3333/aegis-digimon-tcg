import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-093 Queen Device", () => {
  it("preserves color waiver, same-target DP restriction, self placement, and Security debuff", () => {
    const card = runtimeCompiledCard("BT19-093");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [{
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHaveNone",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Queen Device"], match: "name" }] },
          },
        }],
      },
      {
        trigger: "AllTurns",
        actions: [{
          kind: "SubTrigger",
          event: "whenTrashedByEffect",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -3000,
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
        }],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -3000,
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
            restriction: "cannotActivateWhenDigivolving",
            duration: "untilOpponentTurnEnd",
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
            keyword: { keyword: "SecurityAttack", amount: -2, raw: "＜Security Attack -2＞" },
            duration: "forTheTurn",
          },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });
});
