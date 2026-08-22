import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-100.js";

describe("BT5-100 Royal Nuts", () => {
  it("reveals five, adds exactly one Digisorption Digimon, and bottoms the rest", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-100", as: "option" }], deck: [{ card: "BT5-058", as: "digisorption" }, "BT5-001", "BT5-002", "BT5-003", "BT5-004"] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digisorption").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("digisorption").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("bottoms all five cards when none has Digisorption", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-100", as: "option" }], deck: ["BT5-001", "BT5-002", "BT5-003", "BT5-004", "BT5-005"] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 5);
    expect(s.state.players[0]!.deck).toHaveLength(5);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-100", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
