import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-136.js";

describe("P-136 Arisa Kinosaki", () => {
  it("plays Shoemon from hand on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-136", as: "arisa" }, { card: "P-134", as: "shoemon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arisa").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoemon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoemon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
