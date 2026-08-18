import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-072.js";
import "./BT2-029.js";

describe("BT2-029 MegaSeadramon", () => {
  it("Q1005 rejects a source-less Blocker while a sourced Blocker remains legal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-029", as: "attacker", dp: 20000 }] },
      1: {
        battleArea: [
          { card: "BT1-072", as: "sourceLess" },
          { card: "BT1-072", as: "sourced", under: ["BT1-064"] },
        ],
        security: ["BT1-010"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("sourceLess").permanentId }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("sourced").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("sourceLess").isSuspended).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("sourceLess").permanentId),
    ).toBe(true);
  });

  it("skips the blocker window and completes the player attack when every Blocker is source-less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-029", as: "attacker", dp: 20000 }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });
});
