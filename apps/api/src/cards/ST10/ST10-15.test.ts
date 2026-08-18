import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-15.js";

describe("ST10-15 Darkness Wave", () => {
  it("trashes 3 deck cards and returns a yellow or purple Digimon while you have a yellow Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST10-04"], hand: [{ card: "ST10-15", as: "option" }], deck: [{ card: "ST10-07", as: "returned" }, "ST10-14", "ST10-15"] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId)).toBe(true);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST10-02"], security: [{ card: "ST10-15", as: "option", faceUp: true }], deck: [{ card: "ST10-07", as: "returned" }, "ST10-14", "ST10-15"] } }, { autoOrderTriggers: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId)).toBe(true);
  });
});
