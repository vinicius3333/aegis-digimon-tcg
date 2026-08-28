import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-108.js";

describe("BT4-108 Cyclonic Kick", () => {
  it("unsuspends yours and suspends an opponent independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-059", as: "mine", suspended: true }],
          hand: [{ card: "BT4-108", as: "option" }],
        },
        1: { battleArea: [{ card: "BT4-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("mine").isSuspended && s.perm("target").isSuspended);
    expect([s.perm("mine").isSuspended, s.perm("target").isSuspended]).toEqual([false, true]);
  });

  it("activates the full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-059", as: "mine", suspended: true }],
          security: [{ card: "BT4-108", as: "securityOption", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT4-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect([s.perm("mine").isSuspended, s.perm("target").isSuspended]).toEqual([false, true]);
  });

  it("suspends an opponent even with no own Digimon to unsuspend", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT1-088"], hand: [{ card: "BT4-108", as: "option" }] }, 1: { battleArea: [{ card: "BT4-045", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
  });
});
