import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-065.js";

describe("BT23-065 Phantomon", () => {
  it("offers the hand Main effect only while Violet Inboots is present", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.isFromHand).toBe(true);
    expect(effect.condition).toMatchObject({
      kind: "youHave",
      filter: { nameOrTrait: [{ tokens: ["Violet Inboots"], match: "name" }] },
    });
  });

  it("places Bakemon from trash under a Ghostmon and then digivolves that same host into this card for 3", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Bakemon"], match: "name" }] }, count: 1 },
      underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Ghostmon"], match: "name" }] },
      position: "bottom",
      bindHostAs: "ghostmonHost",
    });
    expect(actions[1]).toMatchObject({
      kind: "Digivolve",
      target: { fromSelectionRef: "ghostmonHost" },
      into: { filter: { isSelfRef: true } },
      from: ["hand"],
      cost: 3,
      payCost: true,
      ignoreRequirements: true,
    });
  });

  it("may play a level 4 or lower Ghost Digimon from trash on deletion", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "OnDeletion")) {
      expect(effect.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        target: {
          filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
        },
      });
    }
  });
});
