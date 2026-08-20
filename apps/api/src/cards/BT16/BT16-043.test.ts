import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-043.js";

describe("BT16-043", () => {
  it("suspends an opponent and gains memory under the independent security conditions", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Suspend", condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } });
    }
  });

  it("grants inherited DP when the top card has Pulsemon in its text", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }] });
  });
});
