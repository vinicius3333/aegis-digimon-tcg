import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-070.js";
import "./BT3-075.js";
import "./BT3-095.js";

describe("BT3-095 Joe Kido", () => {
  it("gains exactly 1 memory at turn start while own Blockers are in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-095", as: "joe" },
          { card: "BT3-075", as: "blockerOne" },
          { card: "BT3-070", as: "blockerTwo" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("joe"));

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-095", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});

describe("BT3-095 Joe Kido — KB Q&A rulings", () => {
  it("gains only 1 memory no matter how many Blocker Digimon are in play (Q1126)", async () => {
    const withTwoBlockers = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-095", as: "joe" },
          { card: "BT3-075", as: "blockerOne" },
          { card: "BT3-070", as: "blockerTwo" },
        ],
      },
    });
    withTwoBlockers.state.memory = 0;
    await advance(withTwoBlockers.engine).fire(EffectTiming.OnStartTurn, withTwoBlockers.perm("joe"));
    expect(withTwoBlockers.state.memory).toBe(1);

    const withoutBlocker = setupEngine({ 0: { battleArea: [{ card: "BT3-095", as: "joe" }, "BT3-007"] } });
    withoutBlocker.state.memory = 0;
    await advance(withoutBlocker.engine).fire(EffectTiming.OnStartTurn, withoutBlocker.perm("joe"));
    expect(withoutBlocker.state.memory).toBe(0);
  });
});
