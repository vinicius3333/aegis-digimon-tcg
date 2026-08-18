import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "./testkit/harness.js";
// Self-register the compiled cards so AD1-001 (a 5000-DP Digimon) resolves as a real
// security battler and the attack path runs through the production combat code.
import "../cards/index.js";

/**
 * SYS-06 — applyIntent-driven full-battle A3 (real combat timing).
 *
 * Extends the existing combat A3 family (Piercing / strike / OnDestroyedAnyone in
 * mechanic.test.ts) with a full battle driven through the PRODUCTION path:
 * `applyIntent(seat, {type:"attack", ...})` -> block window -> compareDP ->
 * deletion -> security battle/check. Each assertion is a concrete GameState delta
 * (battleArea membership, security length), never just `assertNoLoudGap`.
 *
 * Ordered resolution asserted:
 *   - attacker DP > defender DP  => the defender (loser) is deleted, attacker survives
 *     (deletion happens AFTER the compare, not before).
 *   - equal DP                   => BOTH are deleted (tie).
 *   - defender DP > attacker DP  => the attacker (loser) is deleted, defender survives.
 *   - a player-directed WIN proceeds to the defender's security check (a security card
 *     is removed); losing the security battle deletes the attacker.
 *
 * Proving the `Battle` IR KIND itself is deferred to Phase 5 (no clean isolating vehicle
 * today — battle-as-Tamer / BattleWithoutDigimon is a Phase-4 ruleProcess stub); this
 * file scopes SYS-06 "combat/Battle" to real combat TIMING, per the locked plan.
 *
 * FAILS-WHEN-REVERTED: this is a proving A3 over already-correct combat. Mis-ordering
 * deletion vs compare (deleting before the DP comparison), or skipping the security
 * battle/check on a player-directed win, flips the asserted membership/length deltas.
 */

describe("battle — applyIntent drives a full permanent battle (compare -> delete)", () => {
  it("attacker DP > defender DP: the defender (loser) is deleted, attacker survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 9000, as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, suspended: true, as: "defender" }] }, // suspended -> a legal direct target with no block window
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");
    const defender = s.perm("defender");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === defender.permanentId));

    // Compare happened first (9000 > 3000), THEN the loser was deleted.
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("equal DP: the battle is a tie and BOTH are deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 5000, suspended: true, as: "defender" }] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");
    const defender = s.perm("defender");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    // tie => clamp(0) => both deleted (resolvePermanentBattle).
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("defender DP > attacker DP: the attacker (loser) is deleted, defender survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 9000, suspended: true, as: "defender" }] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");
    const defender = s.perm("defender");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("battle — a player-directed win proceeds to the security check/battle", () => {
  it("a landing attack removes a face-down security card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 9000, as: "attacker" }] },
      // Two face-down security cards so the post-attack check removes one without ending the game.
      1: { security: ["BT1-085", "BT1-085"] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");
    const securityBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // The player-directed win proceeds to the security check: exactly one card is removed.
    await settle(() => p1.security.length < securityBefore);
    expect(p1.security.length).toBe(securityBefore - 1);
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true); // attacker survives
    assertNoLoudGap(s);
  });

  it("losing the security battle to a stronger security Digimon deletes the attacker", async () => {
    const s = setupEngine({
      // Attacker (3000) loses the security battle to the flipped 5000-DP security Digimon
      // (AD1-001 definition DP 5000) -> resolveSecurityBattle: attackerDP < securityCardDP.
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: { security: ["AD1-001"] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");
    const securityBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Settle on BOTH outcomes: the attacker's deletion happens mid-resolution, while the
    // checked card leaves the security stack only after the battle resolves (the card is
    // resolved while still in security so a [Security] self-play can locate it there).
    await settle(
      () =>
        !p0.battleArea.some((p) => p.permanentId === attacker.permanentId) &&
        p1.security.length === securityBefore - 1,
    );

    // The attacker lost the security battle and was deleted; the security card was checked.
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(p1.security.length).toBe(securityBefore - 1);
    assertNoLoudGap(s);
  });
});
