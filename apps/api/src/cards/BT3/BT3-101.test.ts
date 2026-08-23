import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-101.js";

describe("BT3-101 Bifrost", () => {
  it("reduces DP and Security Attack until the end of the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-032"], hand: [{ card: "BT3-101", as: "option" }] },
        1: { battleArea: [{ card: "BT3-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").currentDP === 1000 &&
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("applies both penalties for the turn from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT3-101", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT3-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").currentDP).toBe(1000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
