import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-131.js";

describe("P-131 Pteromon", () => {
  it("suspends one opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-131", as: "pteromon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("gives its inherited host +2000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "host", under: ["P-131"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
