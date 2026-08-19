import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-033.js";

describe("BT22-033 Mediamon", () => {
  it("keeps App Fusion, -4000 DP triggers, and both linked play effects", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Musimon", "Recomon", "Mcmon"], cost: 0 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -4000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
        },
      ],
    });
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levels: [3],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
        },
        count: 1,
      },
    });
  });
});
