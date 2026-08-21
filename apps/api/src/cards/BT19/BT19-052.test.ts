import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-052 Vespamon", () => {
  it("preserves security Blocker, face-up-security deletion scaling, Rule trait, and inheritance", () => {
    const card = runtimeCompiledCard("BT19-052");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Royal Base"], cost: 3, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isSecurity: true,
        actions: [{
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] }, count: "all" },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "permanent",
        }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [{
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 2 }, count: 1 },
          playCostCeiling: { base: 2, raise: 2, per: 1, filter: { controller: "mine", faceUp: true }, unit: "security" },
        }],
      })),
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] },
      {
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }] }],
      },
    ]);
  });
});
