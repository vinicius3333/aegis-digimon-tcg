import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-065.js";

describe("BT22-065 PlatinumNumemon", () => {
  it("reduces one opposing Digimon by 8000 DP on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -8000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("once per turn evolves another own CS Digimon from hand after an opponent deletion", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                },
                count: 1,
              },
              into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
            },
          ],
        },
      ],
    });
  });
});
