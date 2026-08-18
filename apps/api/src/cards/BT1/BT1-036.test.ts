import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-036.js";

describe("BT1-036 Garurumon", () => {
  it("unsuspends one of your Digimon on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-036", as: "garurumon" }], battleArea: [
      { card: "BT1-029", as: "target", dp: 2000, suspended: true },
    ] } }, { autoSelectCards: true });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("allows a Digimon that attacked to attack again after it is unsuspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-036", as: "garurumon" }],
        battleArea: [{ card: "BT1-029", as: "attacker", dp: 20000 }],
      },
      1: { security: ["BT1-010", "BT1-011"] },
    }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("attacker").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    await settle(() => s.state.players[1]!.security.length === 1 && !combat.isAttacking);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("garurumon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
  });
});
