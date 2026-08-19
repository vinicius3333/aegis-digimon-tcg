import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-035.js";

describe("BT22-035 Entermon", () => {
  it("links only qualifying level-4-or-lower Link cards to itself and keeps the linked Appmon play effect", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mediamon", "Dreammon"], cost: 0 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Link",
        source: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            hasLinkRequirement: true,
          },
          from: ["hand", "digivolutionCards"],
        },
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        payCost: false,
        optional: true,
      });
    }
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });
});
