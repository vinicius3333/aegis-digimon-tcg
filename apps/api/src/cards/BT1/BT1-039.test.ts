import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-039.js";

describe("BT1-039 Cerberusmon", () => {
  it("can trash 3 cards to unsuspend when attacking, up to twice per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "attacker", dp: 20000 }],
          hand: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: { security: ["BT1-016", "BT1-017", "BT1-018", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.length === 3 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking,
    );
    expect(attack()).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.length === 0 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking,
    );
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !combat.combat.isAttacking);
    expect(attack().ok).toBe(false);
  });

  it("cannot partially pay the three-card hand cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-039", as: "attacker", dp: 20000 }], hand: ["BT1-010", "BT1-011"] },
        1: { security: ["BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });
});
