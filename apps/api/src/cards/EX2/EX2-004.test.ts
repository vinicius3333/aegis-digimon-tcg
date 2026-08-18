import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-004.js";
import "../ST9/ST9-10.js";

describe("EX2-004 Gummymon", () => {
  it("draws once when an opposing Digimon becomes suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-004"] }], hand: [{ card: "ST9-10", as: "suspender" }], deck: [{ card: "BT1-001", as: "drawn" }] }, 1: { battleArea: [{ card: "EX2-014", as: "target" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
