import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-044.js";

describe("BT16-044", () => {
  it("suspends and restricts the same selected opponent Digimon", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "SelectBind", target: { bindAs: "suspended" }, condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Suspend", target: { fromSelectionRef: "suspended" } });
      expect(effect.actions?.[2]).toMatchObject({ kind: "Restrict", target: { fromSelectionRef: "suspended" }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" });
      expect(effect.actions?.[3]).toMatchObject({ kind: "GainMemory", amount: 2, condition: { kind: "zoneCount", value: 3 } });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
  });
});
