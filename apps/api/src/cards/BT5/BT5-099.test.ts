import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-099.js";

describe("BT5-099 Spiral Masquerade", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-099")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("Q1374 activates -3000 DP separately once for each Digimon you control", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-033", "BT5-034"], hand: [{ card: "BT5-099", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-046", as: "first", dp: 10000 },
            { card: "BT5-046", as: "second", dp: 10000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 4000);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(10000);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "eachTurnEnd", s.state.turnSeat);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", s.state.turnSeat);
    await advance(s.engine).recompute();
    expect(s.perm("first").currentDP).toBe(10000);
  });

  it("does nothing when you have no Digimon in play", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT5-099", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT5-046", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("activates the scaled Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-033", "BT5-034"], security: [{ card: "BT5-099", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT5-046", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").currentDP).toBe(4000);
  });
});
