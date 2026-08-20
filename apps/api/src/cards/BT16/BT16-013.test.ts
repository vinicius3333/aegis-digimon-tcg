import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-013.js";

describe("BT16-013", () => {
  it("has Blast Digivolve and reduces all opposing Digimon by 5000 on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: -5000 }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "ModifyDP", amount: -5000 }] });
  });
  it("once per turn deletes an opposing 8000 DP or lower Digimon when security is removed, otherwise gains Security Attack +1", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }, { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, condition: { kind: "ifThisEffectDidNotDelete" } }] }));
});
