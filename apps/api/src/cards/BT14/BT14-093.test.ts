import { describe, it, expect } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 behavioral test for BT14-093 (Emissary of Hope):
//   [Security] You may play 1 [Patamon] from your hand or trash without paying
//   the cost. Add this card to your hand.
//
// Primary observable: when BT14-093 is checked as a security card, it ends up
// in the controller's hand (AddToHandSelf behavior).
//
// FAILS-WHEN-REVERTED: remove the returnToHand call → card stays in trash after check.

const EMISSARY = "BT14-093";

describe("BT14-093 Emissary of Hope [Security] add to hand", () => {
  it("when checked as security, the card is added to the defender's hand", async () => {
    const s = setup(
      {
        // p0 has an attacker Digimon unsuspended.
        0: { battleArea: [{ card: "BT1-009", dp: 2000, as: "attacker" }] }, // any Digimon that can attack
        // p1 has BT14-093 as their only security card.
        1: { security: [{ card: EMISSARY }] },
      },
      // Decline the "may play a Patamon" branch (no Patamon in hand/trash in this test).
      { autoDeclineOptional: true },
    );
    const p1 = s.state.players[1]!;
    const attacker = s.perm("attacker");

    // p0 attacks p1 directly.
    s.state.memory = 3;
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    // Wait for the security check to resolve and Emissary to be added to p1's hand.
    await settle(() => p1.hand.some((c) => c.cardId === EMISSARY), 800);

    expect(p1.hand.some((c) => c.cardId === EMISSARY)).toBe(true);
    // Security stack is now empty.
    expect(p1.security.some((c) => c.cardId === EMISSARY)).toBe(false);
  });
});
