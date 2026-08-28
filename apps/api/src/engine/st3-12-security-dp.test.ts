import { describe, it, expect } from "vitest";
import { type PlayerState, type Seat, Zone } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap, type EngineSetup } from "./testkit/harness.js";
// Self-register every compiled-IR card module so ST3-12's real IR is looked up.
import "../cards/index.js";

/**
 * Real-card A3 for ST3-12 (BLK-05.4): a Tamer whose [Opponent's Turn] static raises YOUR
 * Security Digimon's DP by +2000. The runtime record used to drop the `[Opponent's Turn]`
 * gate, emitting an always-on ModifySecurityDP; plan 03-04 restored it
 * (`action.condition = { kind: "isOpponentsTurn" }`). This drives the REAL compiled IR
 * through the REAL continuous recompute + the REAL interpreter condition gate, then through
 * a REAL security battle.
 *
 * FAILS-WHEN-REVERTED: dropping `condition:{kind:"isOpponentsTurn"}` from ST3-12's
 * effects.json IR (the runtime record revert) makes the +2000 apply on YOUR turn too, so the
 * "no +2000 on your turn" assertion (recomputed delta 0 / attacker survives) goes RED.
 */

interface SecurityDpLedgerLike {
  add(seat: Seat, delta: number, opts?: { continuous?: boolean }): void;
  deltaFor(seat: Seat): number;
  clearContinuous(): void;
}

function securityDpLedger(s: EngineSetup): SecurityDpLedgerLike {
  return (s.engine as unknown as { securityDp: SecurityDpLedgerLike }).securityDp;
}

/**
 * Recompute the continuous tier (the real engine seam: clear-then-re-fire every
 * `EffectTiming.None` effect) and return the REAL ModifySecurityDP delta ST3-12's IR
 * contributed to `seat`'s security on the current `turnSeat`.
 */
async function recomputedSecurityDelta(s: EngineSetup, seat: Seat): Promise<number> {
  await s.engine.recomputeContinuousEffects();
  return securityDpLedger(s).deltaFor(seat);
}

/**
 * Drive a REAL security battle where `seat 1` attacks `seat 0` as a player, re-applying the
 * REAL recomputed ST3-12 delta during the check (the continuous recompute clears the ledger's
 * continuous tier; a continuous source re-applies afterwards — this wraps `clearContinuous` to
 * re-seed the delta ST3-12's recompute actually produced, exercising the real `add`/`deltaFor`
 * read path). Returns whether the attacker SURVIVED the security battle.
 */
async function securityBattleAttackerSurvives(s: EngineSetup, realDelta: number): Promise<boolean> {
  const p1 = s.state.players[1] as PlayerState;
  const SEC_DIGIMON = "BT1-009"; // Digimon, dp 3000

  const attacker = s.putOnBoard(1, { card: "AD1-001", dp: 4000 }); // DP 4000: beats a bare 3000 security Digimon
  s.give(0, Zone.Security, SEC_DIGIMON); // one face-down security Digimon to battle

  const dp = securityDpLedger(s);
  const originalClear = dp.clearContinuous.bind(dp);
  dp.clearContinuous = () => {
    originalClear();
    // re-apply the REAL recomputed continuous delta
    if (realDelta !== 0) dp.add(0, realDelta, { continuous: true });
  };
  try {
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Flush the whole security-check chain (reveal -> battle -> deletion) before reading.
    await settle(() => false);
    assertNoLoudGap(s);
    return p1.battleArea.some((p) => p.permanentId === attacker.permanentId);
  } finally {
    dp.clearContinuous = originalClear;
    originalClear();
  }
}

describe("ST3-12 real-card ModifySecurityDP — opponent-turn-only +2000 (BLK-05.4)", () => {
  it("on the OPPONENT's turn ST3-12 contributes +2000; the boosted security Digimon deletes the attacker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-12", dp: 0 }] } }); // the real ST3-12 Tamer in play (seat 0)

    s.state.turnSeat = 1; // the opponent's (seat 1's) turn — the [Opponent's Turn] gate holds
    const delta = await recomputedSecurityDelta(s, 0);
    expect(delta).toBe(2000); // the REAL IR's +2000 applies on the opponent's turn

    // 3000 + 2000 = 5000 > 4000 attacker => the boosted security Digimon WINS, attacker deleted.
    const survives = await securityBattleAttackerSurvives(s, delta);
    expect(survives).toBe(false);
  });

  it("on YOUR turn ST3-12 contributes NOTHING (the [Opponent's Turn] gate fails)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-12", dp: 0 }] } });

    s.state.turnSeat = 0; // your (seat 0's) turn — the [Opponent's Turn] gate FAILS
    const delta = await recomputedSecurityDelta(s, 0);
    // FAILS-WHEN-REVERTED: dropping condition:{kind:"isOpponentsTurn"} from ST3-12's IR makes
    // this always-on, so the recomputed delta becomes 2000 here and this assertion goes RED.
    expect(delta).toBe(0); // no +2000 on your own turn
  });

  it("WITHOUT ST3-12 in play the same attacker wins the security battle and survives (control — delta 0)", async () => {
    const s = setupEngine();
    s.state.turnSeat = 1; // the opponent attacks; no ST3-12 means no security-DP delta
    const delta = await recomputedSecurityDelta(s, 0);
    expect(delta).toBe(0); // no source => no boost

    // Security DP stays 3000 < 4000 attacker => the attacker WINS and survives.
    const survives = await securityBattleAttackerSurvives(s, delta);
    expect(survives).toBe(true);
  });
});
