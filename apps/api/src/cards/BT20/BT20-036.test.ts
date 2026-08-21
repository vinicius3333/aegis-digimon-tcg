import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-036.js";

describe("BT20-036 BanchoLeomon", () => {
  it("de-digivolves and lowers DP on entry, then DNA-digivolves this Digimon with another before the attack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "DeDigivolve", amount: 2 }, { kind: "ModifyDP", amount: -5000, duration: "untilOpponentTurnEnd" }] });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ actions: [{ kind: "DnaDigivolve", materials: { count: 2, includeRef: "self" }, into: { nameOrTrait: [{ tokens: ["Chaosmon"], match: "name" }] }, optional: true }, { kind: "Attack", optional: true, condition: { kind: "ifThisEffectActed" } }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }] });
  });
});
