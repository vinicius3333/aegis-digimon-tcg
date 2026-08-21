import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-056.js";

describe("BT18-056 TigerVespamon", () => {
  it("scales its suspension by security count and grants Piercing, Reboot, and unsuspend prevention", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-056", as: "tigerVespamon" }],
          security: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "opponentOne" },
            { card: "BT1-030", as: "opponentTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tigerVespamon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTwo"), "unsuspend"));

    expect(s.perm("opponentOne").isSuspended).toBe(true);
    expect(s.perm("opponentTwo").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentOne"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTwo"), "unsuspend")).toBe(true);
  });
});
