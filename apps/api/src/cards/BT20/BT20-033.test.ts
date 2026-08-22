import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-033.js";

describe("BT20-033 LoaderLeomon", () => {
  it("restricts one opposing Digimon's When Digivolving activation and lowers its DP on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Restrict", restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" }, { kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" }] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true, target: { isSelf: true } }] }] });
  });
});
