import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-045 FunBeemon", () => {
  it("preserves the Royal Base security buff, digivolution reduction, inheritance, and ruling boundary", () => {
    const card = runtimeCompiledCard("BT19-045");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Royal Base"], cost: 0, isAlternate: true },
    ]);

    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        isSecurity: true,
        actions: [{
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        }],
      },
      {
        trigger: "YourTurn",
        actions: [{
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        }],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [{
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        }],
      },
    ]);
  });
});
