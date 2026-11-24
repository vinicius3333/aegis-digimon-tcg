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

function playBT19097(s: ReturnType<typeof setup>): void {
  const p0 = s.state.players[0] as PlayerState;
  const card = instance("BT19-097", 0, true);
  p0.hand.push(card);
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({
    ok: true,
  });
}

describe("Lane R6 — SubTriggerEvent dead-clause fixes", () => {
  it("BT8-006: '[Your Turn] when a card is trashed from your deck, Draw 1' (onDiscardLibrary, controller:mine)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnSeat = 0;

    const host = digimon(0, 5000, "AD1-001");
    host.stack.push(instance("BT8-006", 0, true));
    p0.battleArea.push(host);

    for (let i = 0; i < 5; i++) p0.deck.push(instance("AD1-001", 0, false));
    const deckBefore = p0.deck.length;

    p0.battleArea.push(digimon(0, 3000, "BT10-079"));
    playBT19097(s);
    await settle(() => p0.deck.length <= deckBefore - 3, 200);
    await settle(() => false, 40);

    expect(deckBefore - p0.deck.length).toBe(3);
    assertNoLoudGap(s);
  });

  it("BT20-080: '[All Turns] when an opponent's Digimon is deleted, trash the top of their security' (onDeletionOf)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const watcherHost = digimon(0, 3000, "BT20-080");
    watcherHost.stack.push(instance("BT20-080", 0, true));
    p0.battleArea.push(watcherHost);
    const attacker = digimon(0, 9000, "BT1-009");
    attacker.enterFieldTurnCount = -1;
    p0.battleArea.push(attacker);

    const defender = digimon(1, 5000, "BT1-013");
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
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(p1.security.length).toBe(securityBefore - 1);
    assertNoLoudGap(s);
  });

  it("BT15-054: '[Opponent's Turn] when an opponent's Digimon moves from breeding, ... suspend 1' (whenOpponentMovedFromBreeding)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 1;

    const watcher = digimon(0, 8000, "BT15-054");
    watcher.stack.push(instance("BT1-082", 0, true));
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

    expect(suspendCandidate.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("whenOpponentAttacks (BT12-111's fixed target event) fires on a real attack", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 1;

    const watcherHost = digimon(0, 3000);
    p0.battleArea.push(watcherHost);
    const opponentAttacker = digimon(1, 5000);
    opponentAttacker.enterFieldTurnCount = -1;
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

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponentAttacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => correctFired > 0, 200);

    expect(correctFired).toBe(1);
    assertNoLoudGap(s);
  });
});
