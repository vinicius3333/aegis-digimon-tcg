import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-073 LordKnightmon (X Antibody)", () => {
  it("preserves LordKnightmon evolution, collision and piercing, bound De-Digivolve scaling, and conditional Knightmon buffs", () => {
    const card = runtimeCompiledCard("BT19-073");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["LordKnightmon"], cost: 1, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Collision", raw: "＜Collision＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "DeDigivolve",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"] },
              count: 1,
              bindAs: "deDigivolveTarget",
            },
            amount: 1,
            scaling: {
              per: 1,
              filter: { controller: "mine", kind: ["Digimon"] },
              unit: "cards",
            },
          },
          {
            kind: "Restrict",
            target: { fromSelectionRef: "deDigivolveTarget" },
            restriction: "digivolve",
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "AllTurns",
        condition: {
          kind: "selfHasInDigivolutionCards",
          nameOrTrait: [
            { tokens: ["LordKnightmon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
        actions: [
          {
            kind: "GainKeyword",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
              },
              count: "all",
            },
            keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
            duration: "permanent",
          },
          {
            kind: "ModifyDP",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
              },
              count: "all",
            },
            amount: 3000,
            duration: "permanent",
          },
        ],
      },
    ]);
  });
});
