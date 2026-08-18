import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-098.js";

describe("BT2-098 Wyvern's Breath", () => {
  it("draws one and scales the opposing DP reduction with hand size", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-098", as: "option" }, "BT2-034"], deck: ["BT2-035"] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < 5000);
    expect(s.perm("target").currentDP).toBeLessThan(5000);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT2-035")).toBe(true);
  });

  it("activates its draw and scaled DP reduction from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-098", as: "securityOption", faceUp: true }], hand: ["BT2-034"], deck: [{ card: "BT2-035", as: "drawn" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBeLessThan(s.perm("target").baseDP);
  });
});
