import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-207.js";

describe("P-207 Minervamon", () => {
  it("requires a level 5 Beastkin or TS Digimon and has Alliance", () => {
    const card = runtimeCompiledCard("P-207")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 5, traits: ["Beastkin", "TS"], cost: 3, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({ keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] });
  });

  it("plays eligible hand Digimon on play and digivolution, excluding Sea Animal", () => {
    const card = runtimeCompiledCard("P-207")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }], nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }, { tokens: ["TS"], match: "trait" }] } } }],
      });
    }
  });

  it("once per turn plays the same eligible card set from trash when attacking", () => {
    expect(runtimeCompiledCard("P-207")!.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { count: 1, filter: { levelComparison: { op: "lte", value: 4 }, excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] } } }],
    });
  });
});
