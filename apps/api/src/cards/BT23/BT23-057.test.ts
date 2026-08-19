import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-057.js";

describe("BT23-057 Gankoomon", () => {
  it("reduces its play cost by 5 by returning exactly three matching cards from trash to the top or bottom of the deck", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 5,
      cost: {
        kind: "return",
        to: "deckTopOrBottom",
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Huckmon", "Sistermon", "Jesmon"], match: "name" }],
          },
          count: 3,
        },
      },
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays Hinukamuy optionally, then deletes an opposing Digimon with play cost 6 or less plus 3 per other Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "PlayToken",
        tokens: ["Hinukamuy"],
        count: 1,
        optional: true,
        payCost: false,
      });
      expect(actions[1]).toMatchObject({
        kind: "CostModifier",
        mode: "raiseCeiling",
        costType: "playcost",
        amount: 3,
        scaling: { per: 1, unit: "cards", filter: { excludeSelf: true, kind: ["Digimon"] } },
      });
      expect(actions[2]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", playCostLte: 6 }, count: 1 },
        optional: false,
      });
    }
  });
});
