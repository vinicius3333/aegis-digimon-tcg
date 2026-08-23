import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
