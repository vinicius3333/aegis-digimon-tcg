import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-126.js";

describe("P-126 Yolei Inoue", () => {
  it("plays Hawkmon from hand through the first On Play mode", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-126", as: "yolei" }, { card: "P-119", as: "hawkmon" }] } }, { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yolei").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
