import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-034.js";

describe("BT16-034", () => {
  it("reduces an opposing Digimon by 4000 when security is at least 3", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -4000, duration: "untilOpponentTurnEnd", condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -2 }, condition: { kind: "youHave" } });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
  });
});
