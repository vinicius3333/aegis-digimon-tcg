import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-115.js";

describe("BT1-115 Veedramon", () => {
  it("Q991 unsuspends once per turn when attacking while it controls a non-blue Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-115", as: "attacker", dp: 20000 }, "BT1-085"] },
      1: { security: ["BT1-010", "BT1-011"] },
    });
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(
      () => !s.perm("attacker").isSuspended && s.state.players[1]!.security.length === 1 && !combat.combat.isAttacking,
    );
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !combat.combat.isAttacking);
  });

  it("does not unsuspend when attacking without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-115", as: "attacker", dp: 20000 }] },
      1: { security: ["BT1-010"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("Q992 gives only +1000 DP while 2 blue Tamers are in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-040", as: "host", dp: 7000, under: ["BT1-115"] }, "BT1-086", "BT1-086"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(8000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
