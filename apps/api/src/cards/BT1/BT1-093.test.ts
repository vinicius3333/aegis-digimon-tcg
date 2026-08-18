import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-093.js";

describe("BT1-093 Great Tornado", () => {
  it("gives the same Digimon +2000 DP and Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "chosen" }, { card: "BT1-011", as: "other" }], hand: [{ card: "BT1-093", as: "option" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "SecurityAttack"));
    expect(s.perm("chosen").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(1000);
  });

  it("adds itself from security to its owner's hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-093", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
