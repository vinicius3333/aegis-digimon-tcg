import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-192.js";

describe("P-192 Bakemon", () => {
  it("trashes one hand card to delete an opponent level 4 or lower Digimon on play and digivolution", () => {
    const card = runtimeCompiledCard("P-192")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            },
            cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
          },
        ],
      });
    }
  });

  it("has inherited Retaliation", () => {
    expect(runtimeCompiledCard("P-192")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    });
  });
});
