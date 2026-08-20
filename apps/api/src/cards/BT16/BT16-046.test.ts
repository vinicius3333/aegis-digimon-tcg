import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-046.js";

describe("BT16-046", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
  });

  it("suspends two opposing Digimon or Tamers, restricts them, and deletes a Tamer", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Suspend", target: { count: 2 } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" });
      expect(effect.actions?.[2]).toMatchObject({ kind: "Delete", target: { filter: { kind: ["Tamer"], suspended: true } } });
    }
  });

  it("gives your Digimon Security Attack +1 when it suspends", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" }] }] });
  });
});
