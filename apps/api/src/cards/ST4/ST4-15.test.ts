import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST4-15.js";

describe("ST4-15 Needle Spray", () => {
  it("suspends an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST4-03"], hand: [{ card: "ST4-15", as: "option" }] },
        1: { battleArea: [{ card: "ST4-08", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
  it("activates Main and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST4-15", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST4-08", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
