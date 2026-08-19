import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-023.js";

describe("BT23-023 Whamon", () => {
  it("once per turn replaces non-owner-effect removal with an optional stack play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: { op: "lte", value: 4 },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
  });
});
