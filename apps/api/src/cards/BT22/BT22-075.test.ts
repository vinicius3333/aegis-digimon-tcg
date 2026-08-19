import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-075.js";

describe("BT22-075 Fakemon", () => {
  it("links only cards with Link requirements from trash or this stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Link",
        from: ["trash", "digivolutionCards"],
        optional: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            hasLinkRequirement: true,
          },
          count: 1,
        },
      });
    }
  });

  it("plays one of this Digimon's linked cards on leave, once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["linked"],
              target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 },
            },
          ],
        },
      ],
    });
  });
});
