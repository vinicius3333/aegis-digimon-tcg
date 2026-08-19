import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-082.js";

describe("BT22-082 Eater Adam", () => {
  it("deletes an opposing play-cost-7-or-lower Digimon and places Arata underneath when empty", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCost: { op: "lte", value: 7 } }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "PlaceUnder",
        condition: { kind: "selfHasNoDigivolutionCards" },
        underFilter: { isSelfRef: true },
        position: "bottom",
        target: { from: ["hand", "trash"], count: 1 },
      });
    }
  });

  it("anchors the leave replacement to this Eater Adam", () => {
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
