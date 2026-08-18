import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-115.js";

describe("BT1-115 Veedramon", () => {
  it("unsuspends once per turn when attacking while it controls a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-115", as: "attacker", dp: 20000 }, "BT1-085"] }, 1: { security: ["BT1-010", "BT1-011"] } });
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    const attack = () => s.engine.applyIntent(0, { type: "attack" as const, attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" as const } });
    expect(attack()).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended && s.state.players[1]!.security.length === 1 && !combat.combat.isAttacking);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !combat.combat.isAttacking);
  });

  it("gives its Digimon +1000 DP while a blue Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-115"] }, "BT1-086"] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
