import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-196.js";

describe("P-196 Gomamon", () => {
  it("requires a level 2 TS Digimon for evolution", () => {
    expect(runtimeCompiledCard("P-196")!.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
  });

  it("allows free Sea Beast or TS hand digivolution at four or less memory", () => {
    expect(runtimeCompiledCard("P-196")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, condition: { kind: "memoryAtMost", value: 4, controller: "mine" }, into: { nameOrTrait: [{ tokens: ["Sea Beast", "TS"], match: "trait" }] } }],
    });
  });

  it("draws once per turn when attacking with seven or fewer hand cards", () => {
    expect(runtimeCompiledCard("P-196")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 7 } }],
    });
  });
});
