import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-003.js";
import "../BT1/BT1-102.js";

describe("EX2-003 Viximon", () => {
  it("draws once after its controller uses an Option with use cost 2 or more", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-021", as: "host", under: ["EX2-003"] }], hand: [{ card: "BT1-102", as: "option" }], deck: [{ card: "BT1-001", as: "drawn" }] }, 1: { battleArea: ["EX2-014"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
