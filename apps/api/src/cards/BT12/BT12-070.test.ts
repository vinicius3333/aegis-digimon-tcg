import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-070.js";

describe("BT12-070 WarGreymon", () => {
  it("has Raid and gains +3000 DP and Reboot when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-070", as: "war" }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
    expect(observe(s.engine).hasKeyword(s.perm("war"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("war"), "Reboot")).toBe(true);
    expect(s.perm("war").currentDP).toBe(s.perm("war").baseDP + 3000);
  });

  it("unsuspends once when an attack target is switched", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-070", as: "war", suspended: true }] } });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("war").permanentId,
    });
    expect(s.perm("war").isSuspended).toBe(false);
  });

  it("does not unsuspend again from a second target switch in the same turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-070", as: "war", suspended: true }] } });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("war").permanentId,
    });
    s.perm("war").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("war").permanentId,
    });
    expect(s.perm("war").isSuspended).toBe(true);
  });
});
