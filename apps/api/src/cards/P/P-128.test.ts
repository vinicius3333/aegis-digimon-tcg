import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-128.js";

describe("P-128 Cody Hida", () => {
  it("plays Armadillomon from hand through the first On Play mode", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-128", as: "cody" }, { card: "P-121", as: "armadillomon" }] } }, { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cody").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armadillomon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armadillomon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
