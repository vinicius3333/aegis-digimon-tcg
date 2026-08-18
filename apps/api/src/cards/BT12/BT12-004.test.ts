import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-004.js";

describe("BT12-004 TorikaraBallmon", () => {
  it("gives its host +2000 DP when a green Digimon is played", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-047", as: "host", under: ["BT12-004"] }], hand: [{ card: "BT12-047", as: "played" }] } });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("host").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === before + 2000);
    expect(s.perm("host").currentDP).toBe(before + 2000);
  });
});
