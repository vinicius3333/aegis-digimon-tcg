import { describe, it, expect } from "vitest";
import { type PlayerState, type Seat, Zone } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap, type EngineSetup } from "./testkit/harness.js";
// Self-register every compiled-IR card module so ST3-12's real IR is looked up.
import "../cards/index.js";

/**
 * A3 for the ST3-12 live-security-battle continuous recompute (the deferred IR-01 fix).
 *
 * ST3-12 is a Tamer whose `[Opponent's Turn]` static raises YOUR Security Digimon's DP by
 * +2000 (the real compiled IR carries condition `{ kind: "isOpponentsTurn" }`). The
 * ModifySecurityDP consumer was wired but UNPROVEN end-to-end: `runSecurityCheck` cleared the
 * securityDp ledger at the start of the check but never RE-RAN the continuous recompute, so the
 * ST3-12 +2000 was gone by the time the security battle read `securityCardDp`. The prior
 * st3-12-security-dp.test.ts had to monkeypatch `dp.clear` to re-seed the delta — i.e. it
 * proved the recomputed VALUE but SIMULATED its re-application during the battle.
 *
 * This A3 drives a REAL security battle with NO monkeypatch: ST3-12 in play, the opponent
 * attacks as a player, the engine runs the real `runSecurityCheck`, and the boosted (3000 +
 * 2000 = 5000) security Digimon must delete the 4000 attacker — proving the continuous
 * recompute re-applies the +2000 DURING the live battle.
 *
 * FAILS-WHEN-REVERTED: remove the `recomputeContinuousEffects()` re-run inside
 * `runSecurityCheck` (after the ledger clear) and the +2000 is absent during the battle, so the
 * 3000 security Digimon loses to the 4000 attacker and the attacker SURVIVES — RED.
 */

interface SecurityDpLedgerLike {
  deltaFor(seat: Seat): number;
}
function securityDelta(s: EngineSetup, seat: Seat): number {
  return (s.engine as unknown as { securityDp: SecurityDpLedgerLike }).securityDp.deltaFor(seat);
}

const SEC_DIGIMON = "BT1-009"; // Digimon, dp 3000

describe("ST3-12 live-security-battle continuous recompute (IR-01)", () => {
  it("the continuous recompute is idempotent — repeated recomputes keep ST3-12's +2000 stable (no accumulation)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-12", dp: 0 }] } });
    s.state.turnSeat = 1; // opponent's turn — the [Opponent's Turn] gate holds

    // A live security check (runSecurityCheck) fires several recomputes (OnSecurityCheck /
    // OnLoseSecurity windows + a strike-2 attacker checks two cards) before the battle reads
    // securityCardDp. Each must leave the delta at +2000, not accumulate it.
    await s.engine.recomputeContinuousEffects();
    const first = securityDelta(s, 0);
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    const afterRepeats = securityDelta(s, 0);

    expect(first).toBe(2000);
    // FAILS-WHEN-REVERTED: without clearing securityDp inside recomputeContinuousEffects, the
    // +2000 accumulates to +4000/+6000 across recomputes — a stale/accumulating continuous value.
    expect(afterRepeats).toBe(2000);
  });

  it("on the OPPONENT's turn ST3-12's +2000 is recomputed DURING the live security battle, deleting the attacker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-12", dp: 0 }] } });
    const p1 = s.state.players[1] as PlayerState;

    // ST3-12 in play (seat 0); it is seat 1's (the opponent's) turn — the gate holds.
    s.state.turnSeat = 1;

    // Seat 1 attacks seat 0 as a player. Attacker DP 4000 beats a bare 3000 security Digimon,
    // but loses to the +2000 boosted 5000.
    const attacker = s.putOnBoard(1, { card: "AD1-001", dp: 4000 });
    s.give(0, Zone.Security, SEC_DIGIMON);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false);
    assertNoLoudGap(s);

    // FAILS-WHEN-REVERTED: without the recompute inside runSecurityCheck, the 3000 security
    // Digimon loses and the attacker survives.
    const attackerSurvives = p1.battleArea.some((p) => p.permanentId === attacker.permanentId);
    expect(attackerSurvives).toBe(false);
  });

  it("on YOUR turn ST3-12 contributes NOTHING — the attacker wins and survives (the [Opponent's Turn] gate fails)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-12", dp: 0 }] } });
    const p0 = s.state.players[0] as PlayerState;

    s.state.turnSeat = 0; // your turn — the [Opponent's Turn] gate FAILS

    // Seat 0 attacks seat 1, so seat 1's (unboosted) security is checked: the recompute under
    // the gate yields no boost for the attacked seat, so a 4000 attacker beats a 3000 security.
    const attacker = s.putOnBoard(0, { card: "AD1-001", dp: 4000 });
    s.give(1, Zone.Security, SEC_DIGIMON);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false);
    assertNoLoudGap(s);

    // ST3-12 only boosts on the opponent's turn, and only its OWNER's security — neither holds
    // here, so the 4000 attacker beats the 3000 security Digimon and survives.
    const attackerSurvives = p0.battleArea.some((p) => p.permanentId === attacker.permanentId);
    expect(attackerSurvives).toBe(true);
  });
});
