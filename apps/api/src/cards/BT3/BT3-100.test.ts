import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-100.js";

describe("BT3-100 Desperado Blaster", () => {
  it("trashes two bottom sources and suspends the now-sourceless Digimon with green present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020", "BT3-044"], hand: [{ card: "BT3-100", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "BT3-020",
              as: "target",
              under: [
                { card: "BT3-021", as: "first" },
                { card: "BT3-022", as: "second" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0 && s.perm("target").isSuspended);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020", "BT3-044"], security: [{ card: "BT3-100", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT3-020", as: "target", under: ["BT3-021", "BT3-022"] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
