import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-054.js";
import "./BT2-058.js";
import "./BT2-104.js";

describe("BT2-104 Atomic Ray", () => {
  it("unsuspends one Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-054", as: "target", suspended: true }],
          hand: [{ card: "BT2-104", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("Main chooses exactly one own Blocker and excludes non-Blockers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "nonBlocker", suspended: true },
            { card: "BT2-054", as: "firstBlocker", suspended: true },
            { card: "BT2-058", as: "secondBlocker", suspended: true },
          ],
          hand: [{ card: "BT2-104", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("firstBlocker").isSuspended);

    expect(s.perm("firstBlocker").isSuspended).toBe(false);
    expect(s.perm("secondBlocker").isSuspended).toBe(true);
    expect(s.perm("nonBlocker").isSuspended).toBe(true);
  });

  it("unsuspends all of its Blockers and gives each +5000 DP from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT2-104", as: "securityOption", faceUp: true }],
        battleArea: [
          { card: "BT2-054", as: "first", suspended: true },
          { card: "BT2-058", as: "second" },
          { card: "BT2-052", as: "nonBlocker", suspended: true },
        ],
      },
    });
    const firstBase = s.perm("first").currentDP;
    const secondBase = s.perm("second").currentDP;
    const nonBlockerBase = s.perm("nonBlocker").currentDP;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("first").isSuspended).toBe(false);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.perm("first").currentDP).toBe(firstBase + 5000);
    expect(s.perm("second").currentDP).toBe(secondBase + 5000);
    expect(s.perm("nonBlocker").isSuspended).toBe(true);
    expect(s.perm("nonBlocker").currentDP).toBe(nonBlockerBase);
  });
});
