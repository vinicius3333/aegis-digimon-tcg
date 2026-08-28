import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-098.js";
describe("BT7-098 Ultra Turbulence", () => {
  it("reduces an opposing Digimon by 3000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-031"], hand: [{ card: "BT7-098", as: "option" }] },
        1: { battleArea: [{ card: "BT7-043", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
