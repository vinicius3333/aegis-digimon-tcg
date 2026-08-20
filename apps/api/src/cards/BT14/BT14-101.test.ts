import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-101.js";

describe("BT14-101", () => {
  it("allows the hand digivolution when Tai and an opposing 10000 DP Digimon are present", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", isFromHand: true, condition: { kind: "allOf" } });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Digivolve", costOverride: 4, ignoreRequirements: true, payCost: true });
  });
  it("grants Raid and attack, then grants Security Attack +1 and Piercing with a Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "GainKeyword", keyword: { keyword: "Raid" } }, { kind: "Attack" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, { kind: "GainKeyword", keyword: { keyword: "Piercing" } }] });
  });
});
