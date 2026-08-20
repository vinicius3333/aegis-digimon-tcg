import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-059.js";

describe("BT16-059", () => {
  it("de-digivolves under three security and deletes a play-cost 6 or lower Digimon under three security", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { filter: { playCostLte: 6 } }, condition: { kind: "youHave" } });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
  });
});
