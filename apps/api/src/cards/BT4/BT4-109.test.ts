import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-103.js";
import "../EX4/EX4-068.js";
import "./BT4-109.js";

describe("BT4-109 Final Zubagon Punch", () => {
  it("grants +3000 DP and all three keywords when the boosted Digimon reaches 16000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT8-017", as: "target" }], hand: [{ card: "BT4-109", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").currentDP === 16000 &&
        observe(s.engine).hasKeyword(s.perm("target"), "Blocker") &&
        observe(s.engine).hasKeyword(s.perm("target"), "Reboot") &&
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1,
    );
    expect(s.perm("target").currentDP).toBe(16000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("does not grant the conditional keywords below 16000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT4-069", as: "target" }], hand: [{ card: "BT4-109", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 10000);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-109", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});

describe("BT4-109 Final Zubagon Punch — KB Q&A rulings", () => {
  function boardWithTarget(targetDp: number, extraHand: { card: string; as: string }[] = []) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-069", as: "target", dp: targetDp }],
          hand: [{ card: "BT4-109", as: "option" }, ...extraHand],
        },
        1: { security: [{ card: "EX4-068", as: "opponentSecurity", faceUp: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    return s;
  }

  async function playOption(s: ReturnType<typeof boardWithTarget>, alias: string) {
    const trashBefore = s.state.players[0]!.trash.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === trashBefore + 1);
  }

  function grantedKeywords(s: ReturnType<typeof boardWithTarget>) {
    const target = s.perm("target");
    return {
      blocker: observe(s.engine).hasKeyword(target, "Blocker"),
      reboot: observe(s.engine).hasKeyword(target, "Reboot"),
      securityAttack: observe(s.engine).keywordAmount(target, "SecurityAttack"),
    };
  }

  const allKeywords = { blocker: true, reboot: true, securityAttack: 1 };
  const noKeywords = { blocker: false, reboot: false, securityAttack: 0 };

  it("grants the keywords when the +3000 DP raises a Digimon below 16000 DP to 16000 (Q1274)", async () => {
    const reachesThreshold = boardWithTarget(13000);
    await playOption(reachesThreshold, "option");
    expect(reachesThreshold.perm("target").currentDP).toBe(16000);
    expect(grantedKeywords(reachesThreshold)).toEqual(allKeywords);

    const fallsShort = boardWithTarget(12000);
    await playOption(fallsShort, "option");
    expect(fallsShort.perm("target").currentDP).toBe(15000);
    expect(grantedKeywords(fallsShort)).toEqual(noKeywords);
  });

  it("keeps the keywords after another effect reduces the Digimon to 15000 DP or less (Q1275)", async () => {
    const s = boardWithTarget(13000);
    await playOption(s, "option");
    expect(grantedKeywords(s)).toEqual(allKeywords);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("opponentSecurity"));
    await settle(() => s.perm("target").currentDP === 4000);
    expect(grantedKeywords(s)).toEqual(allKeywords);
  });

  it("does not grant the keywords when a later DP boost raises the Digimon to 16000 DP (Q1276)", async () => {
    const s = boardWithTarget(10000, [{ card: "BT2-103", as: "laterBoost" }]);
    await playOption(s, "option");
    expect(s.perm("target").currentDP).toBe(13000);
    expect(grantedKeywords(s)).toEqual(noKeywords);

    await playOption(s, "laterBoost");
    expect(s.perm("target").currentDP).toBe(16000);
    expect(grantedKeywords(s)).toEqual(noKeywords);
  });
});
