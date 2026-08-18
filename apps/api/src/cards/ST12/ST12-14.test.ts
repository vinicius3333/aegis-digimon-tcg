import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST12-14.js";

describe("ST12-14 Aus Generics", () => {
  it("grants +2000 DP, gains 1 memory and grants Piercing with Huckmon in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-04", as: "huckmon" }], hand: [{ card: "ST12-14", as: "option" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("huckmon").currentDP === s.perm("huckmon").baseDP + 2000 && observe(s.engine).hasPierce(s.perm("huckmon")));
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasPierce(s.perm("huckmon"))).toBe(true);
  });

  it("gains 1 memory and returns itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST12-14", as: "option", faceUp: true }] } }, { autoOrderTriggers: true });
    const id = s.inst("option").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === id)).toBe(true);
  });
});
