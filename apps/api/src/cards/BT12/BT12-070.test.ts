import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-070.js";

describe("BT12-070 WarGreymon", () => {
  it("digivolves for 3 from a level-5 MetalGreymon and rejects a name near-match", async () => {
    expect(digivolutionRequirementsFor("BT12-070")).toContainEqual({
      level: 5,
      names: ["MetalGreymon"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT12-068", as: "metal" }],
        hand: [{ card: "BT12-070", as: "war" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("metal").permanentId,
        instanceId: legal.inst("war").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("metal").topCard.cardId === "BT12-070");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("metal").stack.map(({ cardId }) => cardId)).toEqual(["BT12-068"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "weregarurumon" }], hand: [{ card: "BT12-070", as: "war" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("weregarurumon").permanentId,
        instanceId: illegal.inst("war").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

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

  it.each(["mine", "opponent"])("unsuspends when the switched attack belongs to %s", async (owner) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-070", as: "war", suspended: true },
          { card: "BT1-009", as: "mine" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm(owner).permanentId,
    });
    expect(s.perm("war").isSuspended).toBe(false);
  });
});
