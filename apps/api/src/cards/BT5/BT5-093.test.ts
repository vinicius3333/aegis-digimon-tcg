import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-093.js";

describe("BT5-093 Tai Kamiya & Matt Ishida", () => {
  it("gains 2 memory at turn start when the opponent has a level 6 or higher Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-093", as: "tamer" }] },
      1: { battleArea: [{ card: "BT5-084", as: "level6" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("gives all own Omnimon Security Attack +1 on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-093", as: "tamer" }, { card: "BT5-086", as: "omni-a" }, { card: "BT5-111", as: "omni-b" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("omni-a"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("omni-b"), "SecurityAttack")).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-093", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
  });
});
