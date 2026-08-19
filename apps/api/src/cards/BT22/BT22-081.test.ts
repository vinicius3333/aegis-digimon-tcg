import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-081.js";

describe("BT22-081 Eater Eve", () => {
  it("prevents one opponent Digimon from suspending and conditionally places Yuuko", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "PlaceUnder",
        position: "bottom",
        underFilter: { isSelfRef: true },
        condition: { kind: "selfHasNoDigivolutionCards" },
        target: {
          filter: { nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "name" }] },
          from: ["hand", "trash"],
          count: 1,
        },
      });
    }
  });

  it("anchors the leave replacement to this Eater Eve", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true }],
        },
      ],
    });
  });
});
