import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("A3 BT14-001 — inherited draw on opponent security removal", () => {
  it("draws even when the Security Digimon deletes the attacker carrying the Digi-Egg", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-001", dp: 2000, as: "attacker", under: ["BT14-001"] }],
        deck: ["AD1-001", "AD1-001"],
      },
      1: { security: ["BT1-009"] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const handBefore = p0.hand.length;
    const deckBefore = p0.deck.length;

    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    const attackerId = s.perm("attacker").permanentId;
    await settle(
      () => p0.hand.length > handBefore && !p0.battleArea.some((perm) => perm.permanentId === attackerId),
      5000,
    );

    expect(() => s.perm("attacker")).toThrow('permanent for "attacker"');
    expect(p0.hand.length).toBe(handBefore + 1);
    expect(p0.deck.length).toBe(deckBefore - 1);
  });
});
