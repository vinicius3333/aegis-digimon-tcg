import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST16-05 (Gotsumon) — Purple Lv.3 Digimon.
//
// [Your Turn] When this Digimon attacks an opponent's Digimon, lose 2 memory.
// KB Q822: does NOT activate for player-targeted attacks.
//
// FAILS-WHEN-REVERTED: when the effect is absent, memory stays unchanged after
// attacking a Digimon. With the effect active, memory decreases by 2.

const GOTSUMON = "ST16-05";
const DUMMY = "BT1-009";

describe("ST16-05 [Your Turn] When attacking an opponent's Digimon, lose 2 memory", () => {
  it("loses 2 memory when attacking an opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GOTSUMON, dp: 3000, as: "gotsumon" }],
          // Security cards so the game doesn't immediately end.
          security: 3,
        },
        // Opponent has a suspended Digimon (AttackTarget kind: "permanent").
        1: { battleArea: [{ card: DUMMY, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    // Declare attack targeting the opponent's suspended Digimon
    // (AttackTarget kind must be "permanent", not "digimon").
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gotsumon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
    });
    expect(res).toEqual({ ok: true });

    // Wait until memory changes — the [Your Turn] effect fires gainMemory(-2).
    await settle(() => s.state.memory !== 5, 400);

    // gainMemory(-2) fires during OnAllyAttack — memory must have dropped.
    // The attack also suspends Gotsumon (cost) but that doesn't change memory.
    // Net: 5 − 2 = 3 from the effect (no other memory modifiers in this setup).
    expect(s.state.memory).toBe(3);
  });

  it("does NOT lose memory when attacking a player directly (KB Q822)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GOTSUMON, dp: 3000, as: "gotsumon" }], security: 3 },
        // One security card — the attack hits security, not an opponent Digimon.
        1: { security: [{ card: DUMMY }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    s.state.memory = 5;

    // Declare attack targeting the player (kind: "player").
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gotsumon").permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    // Wait for security check to finish (security count drops).
    await settle(() => p1.security.length === 0, 400);

    // Without the −2 effect (player attack), memory remains unchanged from the
    // attack declaration: no automatic memory cost from suspending the attacker.
    // After a player attack with security resolution and no special effects the
    // memory value must still be 5 (or the game might have ended if the security
    // card has its own effect, but no security effects in DUMMY=BT1-009 at our timing).
    // Assert: the -2 effect did NOT fire (memory is not 3 = 5 - 2).
    expect(s.state.memory).not.toBe(3);
    // Also: the -2 must not have been subtracted. The value should remain 5.
    expect(s.state.memory).toBe(5);
  });
});
