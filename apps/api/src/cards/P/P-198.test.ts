import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-198.js";

describe("P-198 DemiDevimon", () => {
  it("encodes free Fallen Angel or TS hand digivolution at four or less memory", () => {
    expect(runtimeCompiledCard("P-198")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, condition: { kind: "memoryAtMost", value: 4, controller: "mine" }, into: { nameOrTrait: [{ tokens: ["Fallen Angel", "TS"], match: "trait" }] } }],
    });
  });

  it("has the TS evolution requirement and inherited once-per-turn Draw 1 then hand trash", () => {
    const inherited = runtimeCompiledCard("P-198")!.effects.find((effect) => effect.isInherited)!;
    expect(runtimeCompiledCard("P-198")!.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(inherited).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } }],
    });
  });
});
