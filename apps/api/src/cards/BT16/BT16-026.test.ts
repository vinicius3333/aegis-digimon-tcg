import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-026.js";

describe("BT16-026", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
  });

  it("de-digivolves and suspends opposing Digimon", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
    }
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete", target: expect.objectContaining({ count: 1 }) }] });
  });
});
