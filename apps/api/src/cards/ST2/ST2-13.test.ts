import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-13.js";

describe("ST2-13 Hammer Spark", () => {
  it("gains 1 memory from Main", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-03"], hand: [{ card: "ST2-13", as: "option" }] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("gains 2 memory from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST2-13", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.memory).toBe(2);
  });
});
