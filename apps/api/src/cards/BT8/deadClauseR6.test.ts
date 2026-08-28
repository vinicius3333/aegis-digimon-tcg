import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { Phase } from "@aegis/shared";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
  assertNoLoudGap,
} from "../../engine/testkit/harness.js";
import "./BT8-006.js";
import "../BT12/BT12-111.js";
import "../BT15/BT15-054.js";
import "../BT19/BT19-097.js";
import "../BT20/BT20-080.js";
import { advance } from "../../engine/testkit/advance.js";

// Lane R6 (silent-dead-clause find): behavioral proof that the SubTriggerEvent renames in
// this lane wake up a REAL, previously-dead watcher, not merely a type-valid one — driving
// the real GameEngine end to end (not a mock), per the four cards below.
//
// Each fixed string was verified two ways before being trusted:
//  1. It is a member of the engine's authoritative SubTriggerEventName union
//     (apps/api/src/engine/effects/EffectContext.ts).
//  2. Something in the engine actually calls `fireSubTrigger(..., "<event>", ...)` for it —
//     confirmed by grepping every literal fireSubTrigger call site in apps/api/src/engine.
//     Several of the compiler's own "did you mean" suggestions (e.g. "whenUnsuspended" ->
//     "whenSuspended", "whenTrashedFromDigivolution" -> "whenTrashedFromDigivolutionCards")
//     FAIL step 2 — they are type-valid strings nothing ever fires — and were deliberately
//     NOT applied; see the lane report for the missing-capability list.

function playBT19097(s: ReturnType<typeof setup>): void {
  const p0 = s.state.players[0] as PlayerState;
  const card = instance("BT19-097", 0, true);
  p0.hand.push(card);
  s.state.memory = 3; // BT19-097's printed play cost
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({
    ok: true,
  });
}

describe("Lane R6 — SubTriggerEvent dead-clause fixes", () => {
  it("BT8-006: '[Your Turn] when a card is trashed from your deck, Draw 1' (onDiscardLibrary, controller:mine)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnSeat = 0; // "[Your Turn]" — the watcher's own controller's turn

    // BT8-006's ability is INHERITED (an In-Training DigiEgg's ability only lives on while
    // it is a digivolution-stack card under a later Digimon, per placementGuard's isInherited
    // rule — kernel.ts's passesPlacementGuard requires isTop === false). Bury it under a host.
    const host = digimon(0, 5000, "AD1-001");
    host.stack.push(instance("BT8-006", 0, false));
    p0.battleArea.push(host);

    for (let i = 0; i < 5; i++) p0.deck.push(instance("AD1-001", 0, false));
    const deckBefore = p0.deck.length;

    p0.battleArea.push(digimon(0, 3000, "BT10-079")); // §4-21 color-requirement source (Purple, for BT19-097)
    playBT19097(s);
    // BT19-097's [Main] mills 2 (deck -2); if BT8-006's Draw 1 fires, a 3rd card leaves the
    // deck for hand (deck -3 total). Deck-count is the robust signal — hand length also drops
    // by 1 when BT19-097 itself leaves hand to resolve, which would mask a hand-length check.
    await settle(() => p0.deck.length <= deckBefore - 3, 200);
    await settle(() => false, 40);

    expect(deckBefore - p0.deck.length).toBe(3); // 2 milled + 1 drawn
    assertNoLoudGap(s);
  });

  it("BT20-080: '[All Turns] when an opponent's Digimon is deleted, trash the top of their security' (onDeletionOf)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // BT20-080's ability is INHERITED (kernel.ts's passesPlacementGuard: an isInherited effect
    // only activates from a digivolution-STACK position, never as the top card) — bury a copy
    // under a host whose TOP card is ALSO named Fenriloogamon: the card's own
    // "selfHasNameContaining" condition reads `ctx.source.permanent()?.topCard` (the PERMANENT's
    // current top-card name), not the buried source card's own name — see
    // interpreter.ts's selfHasNameContaining case.
    //
    // The host is deliberately NOT the attacker: BT20-080 also prints ＜Scapegoat＞ (a battle-
    // deletion replacement — "instead of deleting the Digimon that lost, trash a security card"),
    // which would itself prevent defender's deletion and produce a false-positive security trash
    // via a completely different mechanism. Keeping the watcher passive isolates onDeletionOf.
    const watcherHost = digimon(0, 3000, "BT20-080"); // Fenriloogamon top card
    watcherHost.stack.push(instance("BT20-080", 0, false)); // the inherited-effect-bearing copy
    p0.battleArea.push(watcherHost);
    const attacker = digimon(0, 9000, "BT1-009"); // vanilla attacker — defender really dies
    p0.battleArea.push(attacker);

    const defender = digimon(1, 5000, "BT1-013"); // dies to the 9000 attacker -> onDeletionOf fires
    defender.isSuspended = true;
    p1.battleArea.push(defender);
    for (let i = 0; i < 3; i++) p1.security.push(instance("AD1-001", 1, false));
    const securityBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length < securityBefore, 200);
    await settle(() => false, 200);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false); // defender deleted
    expect(p1.security.length).toBe(securityBefore - 1); // BT20-080's trash-top-security fired
    assertNoLoudGap(s);
  });

  it("BT15-054: '[Opponent's Turn] when an opponent's Digimon moves from breeding, ... suspend 1' (whenOpponentMovedFromBreeding)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 1; // "[Opponent's Turn]" relative to seat 0's watcher

    const watcher = digimon(0, 8000, "BT15-054");
    watcher.stack.push(instance("BT1-082", 0, false)); // [Rosemon] in the digivolution cards
    p0.battleArea.push(watcher);

    const suspendCandidate = digimon(1, 4000);
    suspendCandidate.isSuspended = false;
    p1.battleArea.push(suspendCandidate);

    const bred = digimon(1, 5000);
    bred.inBreeding = true;
    p1.breeding = bred;
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: bred.permanentId })).toEqual({
      ok: true,
    });

    await settle(() => suspendCandidate.isSuspended, 200);
    await settle(() => false, 40);

    expect(suspendCandidate.isSuspended).toBe(true); // BT15-054's opponent-suspend fired
    assertNoLoudGap(s);
  });

  it("whenOpponentAttacks (BT12-111's fixed target event) fires on a real attack", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 1; // seat 1 is attacking

    const watcherHost = digimon(0, 3000);
    p0.battleArea.push(watcherHost);
    const opponentAttacker = digimon(1, 5000);
    p1.battleArea.push(opponentAttacker);

    let correctFired = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenOpponentAttacks",
      sourcePermanentId: watcherHost.permanentId,
      once: false,
      run: async () => {
        correctFired += 1;
      },
      description: "test: whenOpponentAttacks fire count",
    });
    // The card's ORIGINAL (wrong) string, "whenAttacks", is no longer even a member of
    // SubTriggerEventName (it had zero real dependents once BT12-111 was fixed to
    // whenOpponentAttacks, so it was deleted outright rather than left as a permanent trap) —
    // a `.subscribe({ event: "whenAttacks", ... })` arm here would now be a TYPE ERROR, not
    // just a silent no-op, which is the stronger guarantee this test used to demonstrate
    // manually.

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponentAttacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => correctFired > 0, 200);

    expect(correctFired).toBe(1); // GREEN: the fixed event is real and fires
    assertNoLoudGap(s);
  });
});
