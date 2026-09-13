import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-029.js";

describe("BT3-029 Goldramon", () => {
  it("unsuspends once when another own Digimon is played", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        battleArea: [{ card: "BT3-029", as: "goldramon", suspended: true }],
        hand: [{ card: "BT1-011", as: "played" }],
      },
      1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("goldramon").isSuspended, 5000);

    expect(s.perm("goldramon").isSuspended).toBe(false);
  });

  it("respects its once-per-turn limit", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        battleArea: [{ card: "BT3-029", as: "goldramon", suspended: true }],
        hand: [
          { card: "BT1-011", as: "first" },
          { card: "BT1-011", as: "second" },
          { card: "BT1-011", as: "third" },
        ],
      },
      1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("goldramon").isSuspended);
    s.perm("goldramon").isSuspended = true;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("goldramon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.perm("goldramon").isSuspended = true;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("goldramon").isSuspended, 5000);
    expect(s.perm("goldramon").isSuspended).toBe(false);
  });
});
