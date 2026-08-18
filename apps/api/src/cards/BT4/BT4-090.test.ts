import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-090.js";

describe("BT4-090 Chaosmon", () => {
  it("has Piercing, unsuspends when digivolving, and attacks an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-057", as: "base", suspended: true }], hand: [{ card: "BT4-090", as: "evolving" }] },
        1: { battleArea: [{ card: "BT3-019", as: "target", dp: 13_000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("base").isSuspended);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("does not let a normal attack target an unsuspended Digimon after the granted attack ends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-090", as: "chaos" }] },
      1: { battleArea: [{ card: "BT3-019", as: "unsuspended" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("chaos").attackablePermanentIds).not.toContain(
      s.perm("unsuspended").permanentId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chaos").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
