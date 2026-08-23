import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-197.js";

describe("P-197 Patamon", () => {
  it("encodes free Angel or TS hand digivolution at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-197")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
          into: { nameOrTrait: [{ tokens: ["Angel", "TS"], match: "trait" }] },
        },
      ],
    });
  });

  it("has the TS evolution requirement and inherited once-per-turn -2000 DP attack effect", () => {
    const card = runtimeCompiledCard("P-197")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });
});
