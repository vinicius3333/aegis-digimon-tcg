import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-11.js";

describe("ST7-11 Lightning Joust", () => {
  it("gives +2000 DP and Security Attack +1 when your security is not greater", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-02", as: "target" }],
          hand: [{ card: "ST7-11", as: "option" }],
          security: ["ST7-01"],
        },
        1: { security: ["ST7-01", "ST7-01"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").currentDP === 4000 &&
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST7-11", as: "option", faceUp: true }] } },
      { autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("does not grant Security Attack when your security exceeds your opponent's", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST7-02", as: "target" }],
        hand: [{ card: "ST7-11", as: "option" }],
        security: ["ST7-01", "ST7-01"],
      },
      1: { security: ["ST7-01"] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});
