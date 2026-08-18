import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-106.js";

describe("BT2-106 Iron-Fisted Onslaught", () => {
  it("de-digivolves up to four cards without passing level 3", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-052"], hand: [{ card: "BT2-106", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target", under: ["BT2-043", "BT2-044", "BT2-046"] }] } }, { autoSelectCards: true });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length < 3);
    expect(s.perm("target").stack.length).toBeLessThan(3);
  });

  it("activates De-Digivolve 4 from security without passing level 3", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-106", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-045", as: "target", under: ["BT2-043", "BT2-044", "BT2-046"] }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").stack.length).toBeLessThan(3);
  });
});
