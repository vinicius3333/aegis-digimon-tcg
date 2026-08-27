import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-070.js";
import "./BT3-071.js";
import "./BT3-106.js";

describe("BT3-106 Final Zubagon Punch", () => {
  it("gives Security Attack +1 to all Digimon with Blocker or Reboot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-070", as: "blocker" },
          { card: "BT3-071", as: "reboot" },
        ],
        hand: [{ card: "BT3-106", as: "option" }],
      },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("blocker"), "SecurityAttack") === 1 &&
        observe(s.engine).keywordAmount(s.perm("reboot"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("blocker"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("reboot"), "SecurityAttack")).toBe(1);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-106", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});
