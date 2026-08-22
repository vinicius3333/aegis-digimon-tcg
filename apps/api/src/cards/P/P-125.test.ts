import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-125.js";

describe("P-125 Ken Ichijoji", () => {
  it("plays Wormmon from hand through the first On Play mode", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-125", as: "ken" }, { card: "BT12-047", as: "wormmon" }] } }, { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ken").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("wormmon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("wormmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
