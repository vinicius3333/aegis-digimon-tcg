import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
// Boot side-effect: self-registers every compiled-IR card, so the attack runs the real path.
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const ATTACKER = "AD1-001"; // Lv.4, 5000 DP, no keywords.
const BLOCKER = "ST18-07"; // Kokatorimon: printed ＜Blocker＞, so the block window parks the attack.
const PLAYABLE = "BT1-009"; // Lv.3, 3-memory play cost.
const DELETER = "BT13-011"; // [On Play] deletes 1 opponent Digimon with 3000 DP or less.

/**
 * CR section 11: the attack is one uninterrupted process, from declaration to the end of the
 * battle. A combat prompt parks it mid-process, and those prompts live in `state.combatWindow`
 * rather than in `state.pendingDecision` — so the per-verb `decision-pending` gates never saw
 * them, and the turn player could act on their board while the defender still owed an answer.
 *
 * Observed in match 0237ac1a-921b-421a-8783-9b7510b1007c: an attack redirected onto a Digimon
 * opened a ＜Barrier＞ prompt, the attacking seat played two Digimon while it hung open, then
 * ended the turn — and the battle never resolved at all.
 */
describe("attack action window — no board verb crosses an attack in flight", () => {
  it("refuses plays and the turn pass while a combat prompt parks the attack", async () => {
    const s = setupEngine({
      0: { hand: [{ card: PLAYABLE, as: "extra" }], battleArea: [{ card: ATTACKER, dp: 5000, as: "attacker" }] },
      1: { battleArea: [{ card: BLOCKER, dp: 2000, as: "blocker" }], security: [ATTACKER] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    // The prompt is mirrored in the combat window, NOT in pendingDecision: this is exactly the
    // state the old gates read as "nothing pending, go ahead".
    expect(s.state.combatWindow?.kind).toBe("block");
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("extra").instanceId })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: false, reason: "wrong-phase" });
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: false, reason: "wrong-phase" });

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(PLAYABLE);

    // The defender's own verbs still reach the engine, so the attack can finish.
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(0);
    // With the attack over, the same play the gate just refused goes through.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("extra").instanceId })).toEqual({ ok: true });
  });

  it("refuses an attack while an earlier verb is parked on an Evade prompt", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: DELETER, as: "deleter" }],
        battleArea: [{ card: ATTACKER, dp: 5000, as: "attacker" }],
      },
      1: { battleArea: [{ card: PLAYABLE, dp: 3000, as: "evader" }], security: [ATTACKER] },
    });
    s.state.memory = 5;
    await s.ready();
    const evader = s.perm("evader");
    advance(s.engine).ledgers.continuous.addKeywordGrant(evader.permanentId, "Evade", EffectDuration.Permanent);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.combatWindow?.kind === "evade");

    const attack = {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    } as const;
    expect(s.engine.applyIntent(0, attack)).toEqual({ ok: false, reason: "wrong-phase" });
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: evader.permanentId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0);

    expect(evader.isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, attack)).toEqual({ ok: true });
  });

  it("keeps surrender available while an attack is parked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: ATTACKER, dp: 5000, as: "attacker" }] },
      1: { battleArea: [{ card: BLOCKER, dp: 2000, as: "blocker" }], security: [ATTACKER] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    expect(s.state.gameOver).toBe(true);
  });
});
