import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-105.js";

describe("BT3-105 Breath of the Gods", () => {
  it("grants Reboot and protection from DP reduction and returns", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-059", as: "target" }, { card: "BT3-070", as: "untouched" }],
          hand: [{ card: "BT3-105", as: "option" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("target"), "Reboot") &&
        observe(s.engine).isRestricted(s.perm("target"), "dpImmune") &&
        observe(s.engine).isRestricted(s.perm("target"), "beReturned"),
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "beReturned")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("untouched"), "Reboot")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("untouched"), "dpImmune")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("untouched"), "beReturned")).toBe(false);
  });

  it("prevents the opponent's Digimon from attacking players from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-105", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "BT3-059", as: "opponent" }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
  });
});
