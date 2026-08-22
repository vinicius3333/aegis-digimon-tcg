import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-032.js";

describe("BT20-032 Bulkmon", () => {
  it("may take the top security card at three or more, then mandates Recovery +1 at two or fewer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true, optional: true, condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect?.actions[1]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 2 } });
      expect(effect?.actions[1]?.optional).not.toBe(true);
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
