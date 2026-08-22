import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-160.js";

describe("P-160 Tyrannomon (X Antibody)", () => {
  it("requires non-X-Antibody Tyrannomon for zero-cost digivolution", () => {
    expect(runtimeCompiledCard("P-160")!.digivolutionRequirement).toEqual([
      { level: 4, names: ["Tyrannomon"], excludeTraits: ["X Antibody"], cost: 0, isAlternate: true },
    ]);
  });

  it("checks Tyrannomon name or X Antibody trait in the stack for its attack digivolution", () => {
    const attack = runtimeCompiledCard("P-160")!.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attack).toMatchObject({
      actions: [{
        kind: "Digivolve",
        optional: true,
        reduceCost: 1,
        condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: expect.arrayContaining([
          { tokens: ["Tyrannomon"], match: "name" },
          { tokens: ["X Antibody"], match: "trait" },
        ]) } },
        into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }, { tokens: ["Dinosaur"], match: "trait" }] },
      }],
    });
  });
});
