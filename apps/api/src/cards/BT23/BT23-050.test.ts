import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-050.js";

describe("BT23-050 Ankylomon", () => {
  it("has Blocker as a main and inherited keyword", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Blocker"]);
  });

  it("gives one opposing Digimon -2000 DP until the opponent's turn ends on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("then optionally DNA digivolves two of your Digimon into Shakkoumon only during your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[1];
      expect(action).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { nameOrTrait: [{ tokens: ["Shakkoumon"], match: "name" }] },
        from: ["hand"],
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });
});
