import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-042.js";

describe("BT5-042 Knightmon", () => {
  it("gives one opponent Digimon -4000 DP for the turn", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-042", as: "source" }] }, 1: {
      battleArea: [{ card: "BT5-045", as: "target", dp: 11000 }, { card: "BT5-045", as: "other", dp: 11000 }],
    } }, { autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(11000);
  });
});
