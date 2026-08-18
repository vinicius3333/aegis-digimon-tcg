import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-109.js";

describe("BT2-109 Trump Sword", () => {
  it("can delete one own Digimon to delete opposing level 4 or lower Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-067", as: "cost" }], hand: [{ card: "BT2-109", as: "option" }] }, 1: { battleArea: [{ card: "BT2-043", as: "target" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-109", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
