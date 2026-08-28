import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { makeDigimon as digimon, setupEngine as setup, settle, type EngineSetup } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * A3 behavioral proof for §16-33-1 <Vortex> (Comprehensive Rules):
 *
 *   16-33-1. <Vortex> allows the Digimon with this effect to attack an opponent's
 *   Digimon at the end of your turn. <Vortex> is a keyword effect that ALSO allows a
 *   Digimon to attack in the same turn it was played.
 *
 * combat/legality.ts's `canAttackerDeclare` gated summoning sickness on `hasRush`
 * alone; a Vortex-only Digimon that entered the field this turn was rejected before
 * the (correctly implemented) unsuspended-target relaxation was ever reached. Real
 * card: BT20-101, printed <Vortex>, no <Rush>.
 */

const NON_KEYWORD_CARD = "AD1-001";
const VORTEX_CARD = "BT20-101"; // printed <Vortex>, no <Rush>

function attackDeclare(s: EngineSetup, attackerPermanentId: string, targetPermanentId: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId,
    target: { kind: "permanent", permanentId: targetPermanentId },
    vortex: true,
  });
}

describe("<Vortex> (Comprehensive Rules §16-33) — same-turn-attack grant", () => {
  it("a <Vortex> Digimon may declare a Vortex attack the very turn it was played", async () => {
    // BT20-101 also prints "[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon
    // may unsuspend". Now that combat suspension fires `whenSuspended`, declaring the attack
    // opens that optional prompt mid-flow; left unanswered it stalls the attack. Declining is
    // the branch this test wants — it is about summoning sickness, not about the unsuspend.
    const s = setup({ autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    s.state.turnCount = 1;
    const vortexer = digimon(0, 8000, VORTEX_CARD); // printed <Vortex>, no <Rush>
    vortexer.enterFieldTurnCount = s.state.turnCount; // entered THIS turn
    p0.battleArea.push(vortexer);
    const target = digimon(1, 3000, NON_KEYWORD_CARD); // unsuspended -- only a Vortex attack may hit it
    p1.battleArea.push(target);
    await s.engine.recomputeContinuousEffects(); // pick up the printed <Vortex> grant

    expect(attackDeclare(s, vortexer.permanentId, target.permanentId)).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    // The Vortex attack resolved -- the target (much lower DP) was deleted, and the attack
    // was not rejected as illegal for summoning sickness.
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
  });

  it("NEGATIVE CONTROL: a plain Digimon with neither <Rush> nor <Vortex> still cannot attack the turn it was played", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    s.state.turnCount = 1;
    const plain = digimon(0, 8000, NON_KEYWORD_CARD); // no <Rush>, no <Vortex>
    plain.enterFieldTurnCount = s.state.turnCount; // entered THIS turn
    p0.battleArea.push(plain);
    const target = digimon(1, 3000, NON_KEYWORD_CARD);
    target.isSuspended = true;
    p1.battleArea.push(target);

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: plain.permanentId,
      target: { kind: "permanent", permanentId: target.permanentId },
    });

    // Summoning sickness still applies with neither grant present.
    expect(result.ok).toBe(false);
    expect(target.isSuspended).toBe(true); // untouched -- the attack never happened
  });
});
