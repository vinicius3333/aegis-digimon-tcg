import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-054.js";

describe("BT18-054 AncientKazemon", () => {
  it("suspends only opponent Digimon at or below its DP and restricts every opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-054", as: "ancientKazemon" }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "lowOpponent" },
            { card: "BT1-030", as: "highOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.perm("lowOpponent").baseDP = 5000;
    s.perm("lowOpponent").currentDP = 5000;
    s.perm("highOpponent").baseDP = 12000;
    s.perm("highOpponent").currentDP = 12000;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancientKazemon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("highOpponent"), "unsuspend"));

    expect(s.perm("lowOpponent").isSuspended).toBe(true);
    expect(s.perm("highOpponent").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lowOpponent"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highOpponent"), "unsuspend")).toBe(true);
  });
});
