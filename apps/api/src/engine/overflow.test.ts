import { describe, it, expect } from "vitest";
import type { GameState, Permanent, PlayerState, Seat } from "@aegis/shared";
import { MemoryGauge } from "./MemoryGauge.js";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
  type EngineSetup,
} from "./testkit/harness.js";
import "../cards/index.js";

/**
 * `GameEngine.primitives` is private; every real engine collaborator drives it through
 * intents/other primitives, never directly. Test-only reach-through, same pattern as
 * `mechanic.test.ts`'s `effectDelete` helper, to invoke the effect-driven verbs
 * (returnToHand/deletePermanent/playInstances/placeUnder) that a card's compiled effect
 * would otherwise call.
 */
interface PrimitivesAccess {
  deletePermanent(ids: string[], cause?: string): Promise<number>;
  returnToHand(instanceIds: string[]): Promise<unknown[]>;
  returnToDeck(instanceIds: string[], opts?: { toTop?: boolean }): Promise<unknown[]>;
  playInstances(instanceIds: string[], opts?: { payCost?: boolean }): Promise<Permanent[]>;
  placeUnder(targetPermanentId: string, instanceIds: string[]): Promise<unknown[]>;
  addSecurity(seat: Seat, instanceIds: string[], opts?: { toTop?: boolean; faceUp?: boolean }): Promise<void>;
  deDigivolve(permanentId: string, n: number, opts?: { byEffectSeat?: Seat; stopAtLevel?: number }): unknown[];
  trash(instanceIds: string[]): Promise<unknown[]>;
}
function primitivesOf(s: EngineSetup): PrimitivesAccess {
  return (s.engine as unknown as { primitives: PrimitivesAccess }).primitives;
}

/**
 * <Overflow> (Comprehensive Rules §4-18): when a Digimon ACE card moves FROM the field, or
 * FROM under a card, TO another area, the memory marker moves by the card's printed
 * `overflowMemory` value — a LOSS for the ACE's own controller, applied immediately and
 * regardless of whose turn it is (§4-18-2). It is NOT processed when a card enters the field
 * (§4-18-3) or lands under a card (§4-18-4).
 *
 * MGraymon (BT14-014) is isAce with overflowMemory 3; Greymon (AD1-001, the harness default
 * card) is not ACE and serves as the negative control.
 */
const ACE = "BT14-014"; // isAce: true, overflowMemory: 3
const ACE_OVERFLOW = 3;
const NON_ACE = "AD1-001";

/** Read the given seat's own-perspective memory (positive favours that seat). */
function memoryFor(state: GameState, seat: Seat): number {
  return new MemoryGauge(state).memoryFor(seat);
}

describe("<Overflow> (Comprehensive Rules §4-18)", () => {
  it("charges the ACE's controller when it is deleted in combat", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 9000);
    const defender = digimon(1, 4000, ACE);
    defender.isSuspended = true; // legal direct-attack target, no block window
    p0.battleArea.push(attacker);
    p1.battleArea.push(defender);

    const before = memoryFor(s.state, 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.length === 0);

    // The ACE's own controller (seat 1) loses the printed overflow amount, independent of
    // who the turn player is (seat 0, here).
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  it("charges the ACE's controller when it is returned to hand by an effect", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const ace = digimon(1, 4000, ACE);
    p1.battleArea.push(ace);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).returnToHand([ace.topCard!.instanceId]);

    expect(p1.battleArea).toHaveLength(0);
    expect(p1.hand.some((c) => c.instanceId === ace.topCard!.instanceId)).toBe(true);
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  it("charges the ACE's controller when it is deleted by an effect (trashed)", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const ace = digimon(1, 4000, ACE);
    p1.battleArea.push(ace);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).deletePermanent([ace.permanentId], "byEffect");

    expect(p1.battleArea).toHaveLength(0);
    expect(p1.trash.some((c) => c.instanceId === ace.topCard!.instanceId)).toBe(true);
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  it("does NOT process Overflow when the ACE is played onto the field (entering, §4-18-3)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const card = instance(ACE, 0, false);
    p0.hand.push(card);

    const before = memoryFor(s.state, 0);
    const played = await primitivesOf(s).playInstances([card.instanceId], { payCost: false });

    expect(played).toHaveLength(1);
    expect(p0.battleArea.some((p) => p.permanentId === played[0]!.permanentId)).toBe(true);
    expect(memoryFor(s.state, 0)).toBe(before);
  });

  it("does NOT process Overflow when the ACE is placed under another card (§4-18-4)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const host = digimon(0, 5000);
    p0.battleArea.push(host);
    const card = instance(ACE, 0, false);
    p0.hand.push(card);

    const before = memoryFor(s.state, 0);
    const placed = await primitivesOf(s).placeUnder(host.permanentId, [card.instanceId]);

    expect(placed).toHaveLength(1);
    expect(host.stack.some((c) => c.instanceId === card.instanceId)).toBe(true);
    expect(memoryFor(s.state, 0)).toBe(before);
  });

  it("charges the ACE's OWNER even when the deletion happens on the opponent's turn", async () => {
    const s = setup();
    s.state.turnSeat = 1; // seat 0 (the ACE's controller) is the NON-turn player
    const p0 = s.state.players[0] as PlayerState;
    const ace = digimon(0, 4000, ACE);
    p0.battleArea.push(ace);

    const beforeAceOwner = memoryFor(s.state, 0);
    const beforeTurnPlayer = memoryFor(s.state, 1);
    await primitivesOf(s).deletePermanent([ace.permanentId], "byEffect");

    // The ACE's owner (seat 0, NOT state.turnSeat) loses memory; the turn player (seat 1)
    // gains the mirrored amount on the shared gauge, but is not who Overflow "charges" —
    // asserting through seat 0's own perspective is what would fail if the seam credited
    // `state.turnSeat` instead of the card's owner (the sibling bug this task calls out).
    expect(memoryFor(s.state, 0)).toBe(beforeAceOwner - ACE_OVERFLOW);
    expect(memoryFor(s.state, 1)).toBe(beforeTurnPlayer + ACE_OVERFLOW);
  });

  it("does nothing when a non-ACE Digimon leaves the field", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const nonAce = digimon(1, 4000, NON_ACE);
    p1.battleArea.push(nonAce);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).deletePermanent([nonAce.permanentId], "byEffect");

    expect(p1.battleArea).toHaveLength(0);
    expect(memoryFor(s.state, 1)).toBe(before);
  });

  it("charges the ACE's controller when it is bounced from the field to security", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const ace = digimon(1, 4000, ACE);
    p1.battleArea.push(ace);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).addSecurity(1, [ace.topCard!.instanceId]);

    expect(p1.battleArea).toHaveLength(0);
    expect(p1.security.some((c) => c.instanceId === ace.topCard!.instanceId)).toBe(true);
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  it("charges the ACE's controller when it is returned to the deck by an effect", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const ace = digimon(1, 4000, ACE);
    p1.battleArea.push(ace);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).returnToDeck([ace.topCard!.instanceId]);

    expect(p1.battleArea).toHaveLength(0);
    expect(p1.deck.some((c) => c.instanceId === ace.topCard!.instanceId)).toBe(true);
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  it("charges the controller when <De-Digivolve> demotes the ACE off the top", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const perm = digimon(1, 4000, NON_ACE);
    const aceTop = instance(ACE, 1, true);
    perm.topCard = aceTop;
    perm.stack.push(instance(NON_ACE, 1, true));
    p1.battleArea.push(perm);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).deDigivolve(perm.permanentId, 1);

    expect(perm.topCard?.instanceId).not.toBe(aceTop.instanceId);
    // <De-Digivolve> TRASHES the demoted top card (KB Q3471/Q3478), so that is where the ACE
    // lands — the leave-to-trash that charges <Overflow>.
    expect(p1.trash.some((c) => c.instanceId === aceTop.instanceId)).toBe(true);
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  it("charges the controller when the trash() verb itself moves the ACE out from under a card", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const host = digimon(1, 4000, NON_ACE);
    const stackedAce = instance(ACE, 1, true);
    host.stack.push(stackedAce);
    p1.battleArea.push(host);

    const before = memoryFor(s.state, 1);
    await primitivesOf(s).trash([stackedAce.instanceId]);

    expect(host.stack.some((c) => c.instanceId === stackedAce.instanceId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === stackedAce.instanceId)).toBe(true);
    expect(memoryFor(s.state, 1)).toBe(before - ACE_OVERFLOW);
  });

  /**
   * §3-4-4: the breeding area is part of "the field", and §4-18-1/§3-4-5-3/§3-4-5-4 give
   * <Overflow> no breeding exception -- it is a RULE, and the breeding-area lockdown in
   * §3-4-5-3/5-4 only blocks EFFECTS from triggering/activating/affecting a breeding-area
   * card, not rule-level processing (the same distinction that lets digivolution itself,
   * also a rule per §8-1-1, operate on a breeding-area Digimon: §3-4-5-4's own example is a
   * Digimon digivolving IN the breeding area). Reachable via ordinary play: a Digimon that
   * digivolves further while still in the breeding area (§8-1-1 lets "a card on the field"
   * digivolve, and breeding is part of the field) pushes its old top into ITS digivolution
   * stack -- so an ACE Digimon can end up stacked under a breeding permanent exactly like
   * this fixture, with no special-cased effect involved.
   */
  it("charges the ACE's controller when it leaves a breeding-area permanent's digivolution stack", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const breedingHost = digimon(0, 3000, NON_ACE);
    const stackedAce = instance(ACE, 0, true);
    breedingHost.stack.push(stackedAce);
    breedingHost.inBreeding = true;
    p0.breeding = breedingHost;

    const before = memoryFor(s.state, 0);
    await primitivesOf(s).trash([stackedAce.instanceId]);

    expect(p0.trash.some((c) => c.instanceId === stackedAce.instanceId)).toBe(true);
    expect(memoryFor(s.state, 0)).toBe(before - ACE_OVERFLOW);
  });

  /**
   * §4-18-5 ordering: when multiple <Overflow> instances resolve simultaneously, the turn
   * player's are processed first (5-1), then the non-turn player's (5-2). Because the shared
   * gauge clamps at MEMORY_MIN/MAX, this order is load-bearing, not cosmetic -- demonstrated
   * here by starting near MEMORY_MIN so the turn player's loss clamps first and absorbs part
   * of the non-turn player's mirrored gain, which the reverse order would not.
   */
  it("resolves simultaneous Overflow instances turn-player-first, changing the clamped result (§4-18-5)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 0;
    s.state.memory = -9; // near MEMORY_MIN(-10), heavily favouring the non-turn player (seat 1)

    const aceTurnPlayer = digimon(0, 4000, ACE); // owner === turnSeat
    const aceNonTurnPlayer = digimon(1, 4000, ACE); // owner !== turnSeat
    p0.battleArea.push(aceTurnPlayer);
    p1.battleArea.push(aceNonTurnPlayer);

    // Deliberately hand the NON-turn player's card first: this proves the eventual
    // turn-player-first processing order comes from applyOverflow's own §4-18-5 sort, not
    // from caller/array order.
    await primitivesOf(s).returnToDeck([aceNonTurnPlayer.topCard!.instanceId, aceTurnPlayer.topCard!.instanceId]);

    // Turn-player-first: seat 0 loses 3 first (-9 - 3 = -12, clamps to MEMORY_MIN -10), THEN
    // seat 1 loses 3, mirrored as +3 turn-relative (-10 + 3 = -7). The reverse order clamps on
    // the OTHER side instead: seat 1 first (-9 + 3 = -6, no clamp), then seat 0 (-6 - 3 = -9)
    // -- a different final value. The clamp is what makes the ordering observable.
    expect(s.state.memory).toBe(-7);
  });

  /**
   * Same §4-18-5 ordering proof as above, but through `deletePermanent` with BOTH permanent
   * ids in ONE call — a single effect deleting both players' ACE Digimon at once (e.g. a
   * board wipe). `primitives.ts`'s `deletePermanent` must collect every leaving card across
   * the whole batch and apply Overflow ONCE, sorted turn-player-first (via
   * `state/access.ts`'s `deletePermanentsBatched`) -- NOT once per permanent in
   * caller-supplied array order, which would apply the non-turn player's Overflow BEFORE the
   * turn player's here and clamp on the wrong side, producing a different final value (see
   * the "reverse order" arithmetic in the comment above).
   */
  it("resolves simultaneous Overflow turn-player-first through a single multi-permanent deletePermanent call (§4-18-5)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 0;
    s.state.memory = -9; // near MEMORY_MIN(-10), heavily favouring the non-turn player (seat 1)

    const aceTurnPlayer = digimon(0, 4000, ACE); // owner === turnSeat
    const aceNonTurnPlayer = digimon(1, 4000, ACE); // owner !== turnSeat
    p0.battleArea.push(aceTurnPlayer);
    p1.battleArea.push(aceNonTurnPlayer);

    // ONE deletePermanent call, both ids at once -- a single simultaneous action. Handed the
    // NON-turn player's id FIRST, so a correct implementation must still resolve seat 0
    // (turnSeat) before seat 1, proving the ordering comes from the batched Overflow sort,
    // not from this array's order.
    await primitivesOf(s).deletePermanent([aceNonTurnPlayer.permanentId, aceTurnPlayer.permanentId], "byEffect");

    expect(p0.battleArea).toHaveLength(0);
    expect(p1.battleArea).toHaveLength(0);

    // Same clamp arithmetic as the returnToDeck case: turn-player-first gives -7; per-
    // permanent-in-array-order (non-turn player first) would instead give -9.
    expect(s.state.memory).toBe(-7);
  });
});
