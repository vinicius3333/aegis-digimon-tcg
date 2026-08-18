import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-105.js";

describe("BT2-105 Iron-Fisted Onslaught", () => {
  it("de-digivolves one card from an opposing stack", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-052"], hand: [{ card: "BT2-105", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target", under: ["BT2-043"] }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT2-043");
    expect(s.perm("target").topCard?.cardId).toBe("BT2-043");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("activates De-Digivolve 1 from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-105", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-045", as: "target", under: ["BT2-043"] }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").topCard?.cardId).toBe("BT2-043");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
