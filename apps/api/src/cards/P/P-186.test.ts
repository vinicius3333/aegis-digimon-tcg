import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-186.js";

describe("P-186 Gallantmon", () => {
  it("reduces play cost by 2 per five total trash cards when a 13000+ DP Digimon exists", () => {
    expect(runtimeCompiledCard("P-186")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          event: "wouldBePlayed",
          condition: { kind: "anyHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } },
          actions: [
            {
              mode: "reduceCost",
              amount: 2,
              scaling: { per: 5, unit: "cards", filter: { zone: "trash", controller: "both" } },
            },
          ],
        },
      ],
    });
  });

  it("encodes Rush, Blocker, and ruling-correct deletion followed by conditional Recovery", () => {
    const card = runtimeCompiledCard("P-186")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Rush", raw: "＜Rush＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 13000 } },
            },
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      });
    }
  });
});
