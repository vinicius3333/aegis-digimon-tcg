import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-015.js";

describe("BT20-015 Hisyaryumon", () => {
  it("plays Dorumon or Ryudamon and only grants the attack bonus during an attack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { nameOrTrait: [{ tokens: ["Dorumon", "Ryudamon"], match: "name" }] } } });
      expect(effect?.actions[1]).toMatchObject({
        kind: "SubTrigger",
        event: "whenAttacking",
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilOpponentTurnEnd" },
          { kind: "ModifyDP", amount: 5000, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "GrantStatic", grant: { kind: "PreventSecurityActivation", cardType: "Option" }, duration: "forTheTurn" }] });
  });
});
