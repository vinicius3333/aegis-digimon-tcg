import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-029.js";

describe("EX2-029 MegaGargomon", () => {
  it("suspends and prevents unsuspension of one opposing Digimon per green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-027", as: "base" }, "EX2-061", "EX2-061"],
          hand: [{ card: "EX2-029", as: "evolution" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "one" },
            { card: "EX2-019", as: "two" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("one"), "unsuspend") &&
        observe(s.engine).isRestricted(s.perm("two"), "unsuspend"),
    );
    expect(s.perm("one").isSuspended).toBe(true);
    expect(s.perm("two").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("one"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("two"), "unsuspend")).toBe(true);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("one").isSuspended).toBe(true);
    expect(s.perm("two").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("returns one suspended opposing Digimon whose DP is at most its own", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-029", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX2-014", as: "low", suspended: true },
            { card: "EX2-014", as: "low2", suspended: true },
            { card: "EX2-036", as: "high", dp: 14000, suspended: true },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.perm("high").isSuspended).toBe(true);
  });
});
