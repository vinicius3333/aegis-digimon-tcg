import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-053 QueenBeemon", () => {
  it("preserves face-up security play and the all-affected non-battle leave replacement", () => {
    const card = runtimeCompiledCard("BT19-053");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Royal Base"], cost: 3, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] },
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [{
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"], zone: "security", faceUp: true, nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] }, count: 1 },
          from: ["security"],
          payCost: true,
          reduceCostBy: 8,
          optional: true,
        }],
      },
      {
        trigger: "AllTurns",
        actions: [{
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] },
          actions: [{
            kind: "SecurityManipulation",
            op: "placeAsSecurity",
            controller: "mine",
            source: { filter: { useTriggerSource: true }, count: "all" },
            toTop: false,
            faceUp: true,
            optional: true,
          }],
        }],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] },
    ]);
  });
});
