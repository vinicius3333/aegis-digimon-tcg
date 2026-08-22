import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-067.js";
import "../index.js";

describe("BT26-067 Wizardmon", () => {
  it("draws then mandates one hand trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
      ]);
    }
  });

  it("returns itself before the optional reduced-cost red/blue Iliad trash play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: true,
        reduceCostBy: 4,
        optional: true,
        cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
      }],
    });
  });

  it("keeps Retaliation as an inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });
});
