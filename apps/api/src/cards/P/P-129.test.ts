import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-129.js";

describe("P-129 T.K. Takaishi", () => {
  it("plays Patamon from hand through the first On Play mode", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-129", as: "tk" }, { card: "BT1-048", as: "patamon" }] } }, { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("patamon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("patamon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not gain memory when security counts are equal", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-129", as: "tk" }], security: ["BT1-001"] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 0;
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
