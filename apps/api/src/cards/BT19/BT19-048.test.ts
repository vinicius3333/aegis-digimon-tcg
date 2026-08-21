import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-048 ForgeBeemon", () => {
  it("preserves Royal Base security support and the once-per-turn effect replacement", () => {
    const card = runtimeCompiledCard("BT19-048");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Royal Base"], cost: 2, isAlternate: true },
    ]);

    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        isSecurity: true,
        actions: [{
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] }, count: "all" },
          amount: 1000,
          duration: "permanent",
        }],
      },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [{
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            leaveReason: "effect",
          },
          cost: {
            kind: "placeAsSecurity",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            position: "faceUpBottom",
          },
          actions: [],
        }],
      },
      {
        trigger: "Rule",
        actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
      },
    ]);
  });
});
