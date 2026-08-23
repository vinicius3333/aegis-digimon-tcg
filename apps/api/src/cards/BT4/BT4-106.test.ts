import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-106.js";

describe("BT4-106 Purge Shine", () => {
  it("reduces every opposing Digimon by 3000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT4-044"], hand: [{ card: "BT4-106", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT4-045", as: "first" },
            { card: "BT4-090", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 11000);
    expect([s.perm("first").currentDP, s.perm("second").currentDP]).toEqual([4000, 11000]);
  });

  it("activates the Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT4-106", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "BT4-045", as: "target" }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").currentDP).toBe(4000);
  });
});
