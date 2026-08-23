import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST3-13.js";

describe("ST3-13 Heaven's Gate", () => {
  it("gives one Digimon +3000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST3-07", as: "target" }], hand: [{ card: "ST3-13", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 9000);
    expect(s.perm("target").currentDP).toBe(9000);
  });
  it("gives all own Digimon +5000 DP and adds itself to hand from security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST3-07", as: "target" }], security: [{ card: "ST3-13", as: "option", faceUp: true }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.perm("target").currentDP).toBe(11000);
    expect(observe(s.engine).securityDp(0)).toBe(5000);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("also boosts the owner's Security Digimon from security", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["ST3-07"],
        security: [{ card: "ST3-13", as: "option", faceUp: true }, "ST3-02"],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(observe(s.engine).securityDp(0)).toBe(5000);
  });

  it("stacks two security activations in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-07", as: "target" }],
        security: [
          { card: "ST3-13", as: "first", faceUp: true },
          { card: "ST3-13", as: "second", faceUp: true },
        ],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("first"));
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("second"));
    expect(s.perm("target").currentDP).toBe(16000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });
});
