import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-012.js";

describe("BT23-012 Garudamon", () => {
  it("grants Raid to one of your Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        keyword: { keyword: "Raid", raw: "＜Raid＞" },
        duration: "forTheTurn",
      });
    }
  });

  it("may play a qualifying level 4-or-lower Digimon from hand on deletion", () => {
    const effects = compiled.effects.filter((entry) => entry.trigger === "OnDeletion");
    expect(effects).toHaveLength(1);
    expect((effects[0] as any).actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [
            { tokens: ["CS"], match: "trait" },
            { tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" },
          ],
          excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      optional: true,
    });
  });
});
