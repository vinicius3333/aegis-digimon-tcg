import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-208.js";

describe("P-208 Merukimon", () => {
  it("requires a level 5 Beastkin or TS Digimon and has Execute", () => {
    const card = runtimeCompiledCard("P-208")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 5, traits: ["Beastkin", "TS"], cost: 3, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({ keywords: [{ keyword: "Execute", raw: "＜Execute＞" }] });
  });

  it("plays an eligible card from trash on digivolution and deletion, excluding Sea Animal", () => {
    const card = runtimeCompiledCard("P-208")!;
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }], nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }, { tokens: ["TS"], match: "trait" }] } } }],
      });
    }
  });

  it("once per turn returns an opponent's suspended Digimon to deck bottom when attacking", () => {
    expect(runtimeCompiledCard("P-208")!.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "deckBottom", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], suspended: true } } }],
    });
  });
});
