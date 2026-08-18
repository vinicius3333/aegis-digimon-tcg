import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-016.js";
import "./BT4-098.js";

describe("BT4-098 Atomic Inferno", () => {
  it("boosts a Hybrid and grants Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-016", as: "target" }], hand: [{ card: "BT4-098", as: "option" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP + 3000 && observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 2);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(2);
  });

  it("grants all own Digimon Security Attack +1 from security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-016", as: "first" }, { card: "BT4-018", as: "second" }], security: [{ card: "BT4-098", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(2);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(1);
  });
});
