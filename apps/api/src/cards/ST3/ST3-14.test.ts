import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-14.js";

describe("ST3-14 Heaven's Charm", () => {
  it("gives an opposing Digimon -2000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-14", as: "option" }] },
        1: { battleArea: [{ card: "ST3-07", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });
  it("deletes an opposing Digimon reduced from 2000 DP to 0", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-14", as: "option" }] },
        1: { battleArea: [{ card: "ST3-07", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST3-14", as: "option", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
