import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * A3 — BT14-001 (Koromon, Digi-Egg) inherited effect:
 *   [Your Turn][Once Per Turn] When a card is removed from your opponent's security
 *   stack, ＜Draw 1＞.
 *
 * Under test: the effect must fire even when the security check kills the attacker that
 * carries the Digi-Egg.
 *
 * Rules (binding):
 *   CR 13-1-6   — a checked card is removed from the security stack at the check.
 *   CR 13-1-8-3 — the battle against the Security Digimon is the LATER step.
 *   KB Q6085 / Q2221 — upon a security check, a [Security] effect activates first, then
 *     the pending "performs a security check" and "a card was removed from the security
 *     stack" triggers; the battle follows.
 *   KB Q2611 / Q2629 — only a source removed by the [Security] EFFECT misses the trigger,
 *     because that effect resolves before the removal triggers.
 *
 * FAILS-WHEN-REVERTED: move the OnLoseSecurity / whenSecurityRemoved firing in
 * engine/security/securityCheck.ts back after the battle and the attacker is already
 * deleted when the watcher fires, so no card is drawn.
 */

describe("A3 BT14-001 — inherited draw on opponent security removal", () => {
  it("draws even when the Security Digimon deletes the attacker carrying the Digi-Egg", async () => {
    // Attacker (2000 DP) loses the security battle against BT1-009 (3000 DP) and is deleted.
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
    // Both halves: the battle deletion AND the deferred draw (which the removal armed before it).
    await settle(
      () => p0.hand.length > handBefore && !p0.battleArea.some((perm) => perm.permanentId === attackerId),
      5000,
    );

    // The battle still happened and still killed the attacker...
    expect(() => s.perm("attacker")).toThrow('permanent for "attacker"');
    // ...and the inherited ＜Draw 1＞ still resolved, because the card left the security
    // stack (and the watcher fired) before that battle.
    expect(p0.hand.length).toBe(handBefore + 1);
    expect(p0.deck.length).toBe(deckBefore - 1);
  });
});
