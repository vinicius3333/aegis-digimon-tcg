import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-101.js";
describe("BT7-101 Green Memory Boost!", () => {
  it("suspends an opposing Digimon when Ten Warriors is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-051"], hand: [{ card: "BT7-101", as: "option" }] },
        1: { battleArea: [{ card: "BT7-044", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
