import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-103.js";

describe("BT7-103 Mugen", () => {
  it("suspends one opposing Digimon and prevents that same Digimon from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-043"], hand: [{ card: "BT7-103", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT7-044", as: "target" },
            { card: "BT7-045", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));

    expect(observe(s.engine).isRestricted(s.perm("other"), "unsuspend")).toBe(false);
  });

  it("suspends one opposing Digimon from Security without adding the Main unsuspend restriction", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT7-103", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT7-044", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });
});
