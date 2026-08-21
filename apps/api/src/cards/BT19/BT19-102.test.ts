import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-102 Shademon", () => {
  it("preserves deletion replacement, under-Tamer revival, and alternate requirements", () => {
    const card = runtimeCompiledCard("BT19-102");

    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Luminamon"], cost: 2, isAlternate: true },
        { names: ["Nene Amano"], traits: ["Shademon"], cost: 3, isAlternate: true },
      ],
      digiXrosRequirement: [{ materials: [{ names: ["Nene Amano"] }], count: 1 }],
    });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "both", kind: ["Digimon"], excludeSelf: true }, count: 1 },
            cost: {
              kind: "playFromDigivolutionCards",
              target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 },
              payCost: false,
            },
            optional: false,
          },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlayWithoutCost", from: ["underTamers"], payCost: false, optional: true }],
      },
    ]);
  });
});
