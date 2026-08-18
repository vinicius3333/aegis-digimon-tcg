import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-005.js";

describe("BT12-005 Kozenimon", () => {
  it("draws when a Digimon with Save in its text is played", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-049", under: ["BT12-005"] }], hand: [{ card: "BT12-008", as: "saved" }], deck: ["BT1-009"] } });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("saved").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
