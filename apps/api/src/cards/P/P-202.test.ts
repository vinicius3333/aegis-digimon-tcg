import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-202.js";

describe("P-202 Tyrannomon", () => {
  it("requires a level 3 DM Digimon and has Training", () => {
    const card = runtimeCompiledCard("P-202")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]);
    expect(card.effects.find((effect) => !effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Training", raw: "＜Training＞" }],
    });
  });

  it("reduces one suspended own digivolution by 1 for Tyrannomon, Dinosaur, or Ver.1 targets", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", suspended: true, kind: ["Digimon"] },
          into: {
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur", "Ver.1"], match: "trait" },
            ],
          },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("preserves inherited Piercing", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    });
  });
});
