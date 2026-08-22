import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-053.js";

describe("BT20-053 Grademon", () => {
  it("may play Dorumon or Ryudamon into an empty breeding area on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", breeding: true, requiresEmpty: "breedingArea", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Dorumon", "Ryudamon"], match: "name" }] }, count: 1 } });
    }
  });

  it("grants one own Digimon +5000 DP and immunity during an attack until the opponent's turn ends", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions.find((action) => action.kind === "ModifyDP")).toMatchObject({ kind: "ModifyDP", amount: 5000, duration: "untilOpponentTurnEnd", condition: { kind: "duringAttack" } });
      expect(actions.find((action) => action.kind === "GrantImmunity")).toMatchObject({ kind: "GrantImmunity", immuneFrom: "opponentDigimonEffects", duration: "untilOpponentTurnEnd", condition: { kind: "duringAttack" } });
    }
  });

  it("can redirect one opposing attack to this Digimon once per opponent turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }] }] });
  });
});
