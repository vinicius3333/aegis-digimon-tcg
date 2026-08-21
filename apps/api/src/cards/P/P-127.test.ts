import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-127.js";

describe("P-127 Kari Kamiya", () => {
  it("plays Salamon from hand through the first On Play mode", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-127", as: "kari" }, { card: "BT3-033", as: "salamon" }] } }, { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kari").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("salamon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("salamon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not gain memory merely when security counts are equal", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-127", as: "kari" }], security: ["BT1-001"] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 0;
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
