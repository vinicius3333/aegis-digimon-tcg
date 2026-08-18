import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-081.js";

describe("BT1-081 HerculesKabuterimon", () => {
  it("has Piercing and can pay 3 memory to unsuspend at end of attack twice per turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 20000 }] }, 1: { security: ["BT1-010", "BT1-011", "BT1-012"] } }, { autoAcceptOptional: true });
    s.state.memory = 9;
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    const attack = () => s.engine.applyIntent(0, { type: "attack" as const, attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" as const } });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 6 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !combat.combat.isAttacking);
  });
});
