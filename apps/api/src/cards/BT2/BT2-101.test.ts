import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-101.js";

describe("BT2-101 Cherry Blast", () => {
  it("suspends all opposing Digimon at 6000 DP or less", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-046", as: "ownAtBoundary" }],
        hand: [{ card: "BT2-101", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT2-045", as: "belowBoundary" },
          { card: "BT2-046", as: "atBoundary" },
          { card: "BT1-021", as: "aboveBoundary" },
        ],
      },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("belowBoundary").isSuspended && s.perm("atBoundary").isSuspended);

    expect(s.perm("belowBoundary").isSuspended).toBe(true);
    expect(s.perm("atBoundary").isSuspended).toBe(true);
    expect(s.perm("aboveBoundary").isSuspended).toBe(false);
    expect(s.perm("ownAtBoundary").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("activates its Main suspension effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT2-101", as: "securityOption", faceUp: true }] },
      1: {
        battleArea: [
          { card: "BT2-045", as: "belowBoundary" },
          { card: "BT2-046", as: "atBoundary" },
          { card: "BT1-021", as: "aboveBoundary" },
        ],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("belowBoundary").isSuspended).toBe(true);
    expect(s.perm("atBoundary").isSuspended).toBe(true);
    expect(s.perm("aboveBoundary").isSuspended).toBe(false);
  });
});
