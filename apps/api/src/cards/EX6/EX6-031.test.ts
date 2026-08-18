import { describe, it, expect } from "vitest";
import { PlayerState, EffectDuration } from "@aegis/shared";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { setupEngine, settle, assertNoLoudGap, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js"; // register compiled cards so the real recompute + combat run

/**
 * A3 for EX6-031 — security-attack-sign-inversion (wires the new SecurityAttackInvert IR
 * action + the continuous SA-sign-inversion ledger rule to the security-check strike count).
 *
 * Card [Your Turn]: "Change ＜Security Attack -＞ to ＜Security Attack +＞ on all of your Digimon."
 * KB EX6-031 Q3751/Q3752: the inversion flips the SIGN of EACH existing ＜Security Attack ±N＞
 * instance PER-INSTANCE (two ＜SA -1＞ become two ＜SA +1＞, NOT a single ＜SA +2＞) — it is not a
 * value recompute. The engine models ＜Security Attack＞ as signed keyword grants summed once in
 * GameEngine.runSecurityCheck.strikeFor; the inversion is recorded as a per-permanent continuous
 * rule consulted by strikeFor, which negates each existing SA grant's amount while active.
 *
 * Two halves, both fails-when-reverted:
 *   1. CARD -> ENGINE wiring: EX6-031's [Your Turn] static effect, run through the PRODUCTION
 *      continuous-recompute pass, records the SA-sign-inversion on each friendly Digimon.
 *   2. ENGINE consume-site: a friendly Digimon carrying ＜Security Attack -1＞ (strike would be
 *      1 + (-1) = 0) with the inversion active checks 2 security cards (1 base + the -1 flipped
 *      to +1) in a real player-directed attack.
 *
 * FAILS-WHEN-REVERTED levers (documented inline at each assertion).
 */

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(s: EngineSetup): Promise<void> {
  await (
    s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }
  ).recomputeContinuousEffects();
}

describe("EX6-031 — [Your Turn] SA-sign-inversion is recorded on friendly Digimon (production recompute)", () => {
  it("the static [Your Turn] effect records securityAttackInverted on a friendly Digimon", async () => {
    // EX6-031 on the field is the inversion SOURCE; a friendly vanilla Digimon is the subject.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-031", dp: 15000, as: "source" },
          { card: "BT1-024", dp: 6000, as: "friendly" }, // a vanilla Digimon — no printed SA
        ],
      },
    });

    await recompute(s);

    // The [Your Turn] static (EffectTiming.None, owner-turn-gated) re-derives the inversion on
    // every friendly Digimon — including the subject AND the source itself ("all of your Digimon").
    expect(ledger(s).securityAttackInverted(s.perm("friendly").permanentId)).toBe(true);
    expect(ledger(s).securityAttackInverted(s.perm("source").permanentId)).toBe(true);
    // REVERT-CONFIRM-RED: emptying EX6-031's [Your Turn] actions (the residual placeholder) =>
    // the inversion is never recorded => both assertions go RED.

    // Idempotence (CR-01): a second recompute leaves the inversion present, not doubled (the flag
    // is boolean — presence is what strikeFor reads), and re-derived cleanly each pass.
    await recompute(s);
    expect(ledger(s).securityAttackInverted(s.perm("friendly").permanentId)).toBe(true);
  });
});

describe("EX6-031 — SA-sign-inversion strike consume-site (a ＜SA -1＞ Digimon checks 2, not 0)", () => {
  it("a friendly ＜SA -1＞ Digimon checks 2 security cards while the inversion is active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-031", dp: 15000, as: "source" },
          // vanilla — its only SA comes from the grant below
          { card: "BT1-024", dp: 10000, as: "attacker" },
        ],
      },
      // Three face-down security cards so a strike of 2 is observable without ending the game.
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");

    // Grant the attacker ＜Security Attack -1＞ (the kind of grant EX6-031 itself hands out OnPlay):
    // base strike would be 1 + (-1) = 0 (no security card checked) absent the inversion.
    ledger(s).addKeywordGrant(attacker.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, -1);

    // Run the production [Your Turn] recompute so the inversion is recorded on the attacker.
    await recompute(s);
    expect(ledger(s).securityAttackInverted(attacker.permanentId)).toBe(true);

    const securityBefore = p1.security.length;

    // Real player-directed attack: strike = 1 (base) + negate(-1) = 1 + 1 = 2 => two cards checked.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length <= securityBefore - 2);
    expect(p1.security.length).toBe(securityBefore - 2);
    // REVERT-CONFIRM-RED: dropping the `securityAttackInverted` negation in
    // GameEngine.runSecurityCheck.strikeFor => the ＜SA -1＞ stands => strike = 0 => ZERO cards
    // removed => the `securityBefore - 2` assertion goes RED.
    assertNoLoudGap(s);
  });

  // WR-04 (fails-when-reverted): when ＜SA +N＞ grants and the sign-inversion co-occur, the negated
  // sum can drive the strike count below 0. Comprehensive Rules §16-4-4: the actual number of
  // security checks is never negative — it floors at 0. The unguarded `1 + sum` would return a
  // NEGATIVE strike; the floor keeps it at 0 (no security checked). Reverting `Math.max(0, count)`
  // in strikeFor lets a negative reach the consumer (undefined behavior) and the "no card removed"
  // assertion below becomes load-bearing on the floor.
  it("a ＜SA +2＞ Digimon under inversion floors at 0 checks (negative strike clamped, §16-4-4)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-031", dp: 15000, as: "source" },
          { card: "BT1-024", dp: 10000, as: "attacker" },
        ],
      },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");

    // Two ＜Security Attack +1＞ grants: base strike 1 + (+1) + (+1) = 3. Under EX6-031's inversion
    // each amount negates per-instance => 1 + (-1) + (-1) = -1 => must floor to 0.
    ledger(s).addKeywordGrant(attacker.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
    ledger(s).addKeywordGrant(attacker.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);

    await recompute(s);
    expect(ledger(s).securityAttackInverted(attacker.permanentId)).toBe(true);

    const securityBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Negative strike floored to 0 => the attack lands but NO security card is checked/removed.
    await settle(() => false, 30);
    expect(p1.security.length).toBe(securityBefore);
    assertNoLoudGap(s);
  });

  it("WITHOUT the inversion the same ＜SA -1＞ Digimon checks 0 security cards (control)", async () => {
    // No EX6-031 on the field => no inversion. The ＜SA -1＞ stands and strike = 1 + (-1) = 0.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-024", dp: 10000, as: "attacker" }] },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");
    ledger(s).addKeywordGrant(attacker.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, -1);
    await recompute(s);
    expect(ledger(s).securityAttackInverted(attacker.permanentId)).toBe(false);

    const securityBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // strike = 0 => the attack lands but NO security card is checked/removed.
    await settle(() => false, 30);
    expect(p1.security.length).toBe(securityBefore);
    assertNoLoudGap(s);
  });
});
