import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Self-register every card module (including the EX5-053 EffectModule override) so the
// engine drives the REGISTERED hand-written module, not the declarative effect record stub.
import "../index.js";

/**
 * A3 — EX5-053 (Baihumon, EX5, Black/Yellow Lv.6). documented behavior ref class: N/A — this card has no
 * `EffectTrigger` tag for "when your security is checked" in the compiler's closed set
 * (see apps/api/src/cards/EX5/EX5-053.ts header), so it is a hand-written EffectModule
 * that cannot be covered by the static IR auditor. This test is its behavioral proof.
 *
 * Clause under test:
 *   [Opponent's Turn] [Once Per Turn] When your security is checked, if that card is a
 *   Digimon card with the [Deva] trait, play it without battling and without paying the
 *   cost.
 *
 * KB rulings (binding, node tools/kb/query.mjs card EX5-053):
 *   Q3644 (2024-03-28): activates ONLY when the security card REVEALED by the check has
 *     the [Deva] trait — not merely because the attacker has Deva.
 *   Q3645 (2024-03-28): mandatory — "play it" leaves no opt-out; the controller cannot
 *     choose to let the attacker battle the revealed Deva Digimon instead.
 *
 * Drives the REAL security-check flow: a real `attack` intent against the player (no
 * fireTiming injection), so `runSecurityCheck` (engine/security/securityCheck.ts) runs
 * for real, including this session's fix that skips the normal battle/trash branch when
 * OnSecurityCheck has already relocated the revealed card (playFromSecurity).
 *
 * FAILS-WHEN-REVERTED levers:
 *   (a) disable the EX5-053 OnSecurityCheck effect (e.g. make canTrigger always return
 *       false) -> the revealed Deva card is never played to the battle area; instead it
 *       battles the attacker normally and the low-DP attacker is deleted. The "played to
 *       battle area" and "attacker survives" assertions in test 1 go RED.
 *   (b) revert the securityCheck.ts `relocatedByOnSecurityCheck` skip (always resolve the
 *       battle branch) -> the relocated Sandiramon would ALSO be routed through
 *       `resolveRevealedCard`, double-resolving it (a battle against a card no longer in
 *       security, or a duplicate trash). Test 1's "not in trash" / "no battle resolution"
 *       assertions catch this.
 *   (c) drop the [Deva] gate (`isDevaDigimon`) -> test 2's non-Deva security card would
 *       ALSO get force-played instead of resolved normally, failing the "resolved via
 *       battle, not played" assertions.
 */

function alive(p: PlayerState, permanentId: string): boolean {
  return p.battleArea.some((perm) => perm.permanentId === permanentId);
}

describe("A3 EX5-053 (Baihumon) — OnSecurityCheck mandatory Deva play, without battling", () => {
  it("plays a revealed [Deva] Digimon to the battle area without battling, skipping the normal battle resolution", async () => {
    // Baihumon on the DEFENDER's (seat 1) battle area: "your security" = its controller's own
    // security stack, so it must be on the FIELD of the player being attacked.
    //
    // Attacker's DP is BELOW the revealed security Digimon's DP (Sandiramon, BT10-079, 6000).
    // If the normal battle branch ran, the attacker would lose and be deleted — proving the
    // "without battling" skip is load-bearing, not just cosmetic.
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX5-053", dp: 12000, as: "baihumon" }],
        security: [{ card: "BT10-079", as: "revealed" }], // Sandiramon — has the [Deva] trait
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    const trashBefore = p1.trash.length;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Baihumon's mandatory reaction plays the revealed Deva Digimon to the battle area, then
    // the security-check loop continues (OnLoseSecurity + whenSecurityRemoved + emit) before
    // returning — settle on the terminal `securityChecked` event so all of it has flushed.
    await settle(() => s.events.some((e) => e.kind === "securityChecked"));

    const revealedInstanceId = s.inst("revealed").instanceId;
    const playedPermanent = p1.battleArea.find((perm) => perm.topCard?.instanceId === revealedInstanceId);
    expect(playedPermanent, "the revealed Deva Digimon must be played to the battle area").toBeDefined();

    // It left the security stack (playFromSecurity relocated it, not the normal check-removal).
    expect(p1.security.some((c) => c.instanceId === revealedInstanceId)).toBe(false);

    // "without battling" — the normal battle/trash resolution was SKIPPED for this card:
    // it must never have landed in the trash (the branch a plain security Digimon battle
    // would route it through when it's the loser, or the "trashed" no-effect branch).
    expect(p1.trash.some((c) => c.instanceId === revealedInstanceId)).toBe(false);
    expect(p1.trash.length).toBe(trashBefore);

    // The attacker survives: had the normal battle run (DP 3000 vs 6000), it would have been
    // deleted. Its survival is direct proof the battle was skipped, not merely that a play
    // happened alongside a battle.
    expect(alive(s.state.players[0] as PlayerState, attackerId)).toBe(true);

    // A `securityChecked` event was emitted with resolution "effect" (not "battle"), matching
    // securityCheck.ts's `relocatedByOnSecurityCheck` skip.
    const checkedEvent = s.events.find(
      (e) => e.kind === "securityChecked" && "revealedCardId" in e && e.revealedCardId === "BT10-079",
    );
    expect(checkedEvent, "a securityChecked event must be emitted for the revealed card").toBeDefined();
    expect(checkedEvent && "resolution" in checkedEvent ? checkedEvent.resolution : undefined).toBe("effect");
  });

  it("does NOT force-play a revealed non-Deva Digimon — normal battle/trash resolution runs (the [Deva] gate)", async () => {
    // Same low-DP attacker as test 1: if the gate is dropped and this card gets force-played
    // too, the attacker would wrongly survive. Losing the battle (attacker deleted) is the
    // signal that normal resolution ran.
    //
    // Greymon (AD1-001) — a Digimon card, but with NO [Deva] trait (KB Q3644: the gate reads
    // the revealed card's own traits, not the attacker's).
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX5-053", dp: 12000, as: "baihumon" }],
        security: [{ card: "AD1-001", as: "revealed" }],
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    const revealedInstanceId = s.inst("revealed").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((e) => e.kind === "securityChecked"));

    // Normal battle ran: attacker (3000 DP) loses to the revealed Digimon (5000 DP) and is
    // deleted. Had EX5-053 wrongly gated this card in, the attacker would have survived
    // (as in test 1) instead.
    expect(alive(s.state.players[0] as PlayerState, attackerId)).toBe(false);

    // The revealed card was NOT played to Baihumon's controller's battle area — it went
    // through the ordinary trash-after-security-Digimon-battle path instead.
    expect(p1.battleArea.some((perm) => perm.topCard?.instanceId === revealedInstanceId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === revealedInstanceId)).toBe(true);

    const checkedEvent = s.events.find(
      (e) => e.kind === "securityChecked" && "revealedCardId" in e && e.revealedCardId === "AD1-001",
    );
    expect(checkedEvent, "a securityChecked event must be emitted for the revealed card").toBeDefined();
    expect(checkedEvent && "resolution" in checkedEvent ? checkedEvent.resolution : undefined).toBe("battle");
  });
});
