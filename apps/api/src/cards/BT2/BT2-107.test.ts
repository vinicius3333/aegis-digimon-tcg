import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-107.js";

describe("BT2-107 Trump Sword", () => {
  it("gives one Digimon +3000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-067", as: "target" }], hand: [{ card: "BT2-107", as: "option" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("gains 2 memory from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-107", as: "securityOption", faceUp: true }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.memory).toBe(2);
  });
});
