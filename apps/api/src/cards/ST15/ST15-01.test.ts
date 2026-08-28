import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-01 Koromon", () => {
  it("gains +1000 DP once when any attack target switches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", dp: 11000, under: ["BT1-009", "ST15-01"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "otherAttacker" }] },
    });
    const baseDP = s.perm("host").baseDP;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("otherAttacker").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("otherAttacker").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);
  });

  it("does not grant DP to a host without Koromon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-12", as: "host", dp: 11000, under: ["BT1-009"] }] } });
    const baseDP = s.perm("host").baseDP;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched");
    expect(s.perm("host").currentDP).toBe(baseDP);
  });
});
