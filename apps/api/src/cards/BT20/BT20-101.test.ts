import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-101.js";

describe("BT20-101 Zephagamon", () => {
  it("requires a play-cost-10-or-higher level-6 Vortex Warriors base for its cost-1 route", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      level: 6,
      traits: ["Vortex Warriors"],
      basePlayCostMin: 10,
      cost: 1,
      isAlternate: true,
    });
  });

  it("watches any Digimon suspension and unsuspends once per turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
          actions: [{ kind: "Unsuspend", target: { isSelf: true }, optional: true }],
        },
      ],
    });
  });

  it("scales the bottom-deck return by every two suspended Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", optional: true },
          {
            kind: "Return",
            to: "deckBottom",
            scaling: {
              per: 2,
              unit: "cards",
              filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
            },
          },
        ],
      });
    }
  });
});
