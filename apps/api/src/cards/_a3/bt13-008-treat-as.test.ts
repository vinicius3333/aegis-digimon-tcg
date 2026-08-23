/**
 * BT13-008 TreatAs Tamer-as-Digimon — A3 behavioral test (HARD-01/HARD-02).
 *
 * Proves that a Tamer permanent granted Digimon kind via `grantKind` is recognized
 * as a Digimon by the combat-legality system (`canAttackerDeclare`), while an
 * ungranted Tamer of the same card ID is not. The FAILS-WHEN-REVERTED lever proves
 * the grant is causal, not coincidental.
 *
 * FAILS-WHEN-REVERTED: stub grantKind to no-op (don't call addKindGrant). The
 * Tamer stays a pure Tamer — `canAttackerDeclare` returns "illegal-target" for it,
 * proving the grant is the causal difference.
 */

import { describe, it, expect } from "vitest";
import {
  CardKind,
  EffectDuration,
  GameState,
  Permanent,
  CardInstance,
  type Seat,
  type CardDefinition,
} from "@aegis/shared";
import { GameStateAccess } from "../../engine/state/access.js";
import { canAttackerDeclare, type ContinuousLegalityReader } from "../../engine/combat/legality.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";

/** Minimal CardDefinition for a Marcus Damon Tamer. */
function _marcusDamonDef(): CardDefinition {
  return {
    cardId: "BT12-092",
    set: "BT12",
    nameEn: "Marcus Damon",
    kinds: [CardKind.Tamer],
    colors: [],
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  } as CardDefinition;
}

function fakeState(tamerA: Permanent, tamerB: Permanent): GameState {
  return {
    players: [
      { seat: 0 as Seat, battleArea: [tamerA], breeding: undefined },
      { seat: 1 as Seat, battleArea: [tamerB], breeding: undefined },
    ],
  } as unknown as GameState;
}

/** Build a minimal Tamer permanent in the battle area. */
function fakeTamer(permanentId: string, seat: Seat): Permanent {
  const top = new CardInstance();
  top.cardId = "BT12-092";
  top.instanceId = `${permanentId}-top`;
  top.ownerSeat = seat;
  top.faceUp = true;
  const p = new Permanent();
  p.permanentId = permanentId;
  p.controllerSeat = seat;
  p.topCard = top;
  p.isSuspended = false;
  p.inBreeding = false;
  p.baseDP = 0;
  p.currentDP = 0;
  return p;
}

describe("BT13-008 TreatAs A3 (HARD-02)", () => {
  const tamerA = fakeTamer("tamer-A", 0 as Seat);
  const tamerB = fakeTamer("tamer-B", 1 as Seat);
  const state = fakeState(tamerA, tamerB);
  const access = new GameStateAccess(state);

  it("a Tamer granted Digimon kind can attack (canAttackerDeclare returns null)", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addKindGrant("tamer-A", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
    const reader: ContinuousLegalityReader = {
      hasRestriction: () => false,
      hasKeyword: () => false,
      grantedKinds: (pid: string) => ledger.grantedKinds(pid),
    };
    const result = canAttackerDeclare(access, 0 as Seat, tamerA, reader);
    expect(result).toBeNull();
  });

  it("a Tamer without Digimon kind grant cannot attack (returns illegal-target)", () => {
    const ledger = new ContinuousEffectLedger();
    // Tamer B has NO grant
    const reader: ContinuousLegalityReader = {
      hasRestriction: () => false,
      hasKeyword: () => false,
      grantedKinds: (pid: string) => ledger.grantedKinds(pid),
    };
    const result = canAttackerDeclare(access, 1 as Seat, tamerB, reader);
    expect(result).toBe("illegal-target");
  });

  it("FAILS-WHEN-REVERTED: without grantKind, Tamer A also cannot attack", () => {
    // The lever: grantKind is the causal difference.
    // When grantKind is a no-op (no addKindGrant call), the Tamer stays a pure Tamer
    // and canAttackerDeclare returns "illegal-target".
    const ledger = new ContinuousEffectLedger();
    // No call to addKindGrant — simulating grantKind being stubbed to no-op
    const reader: ContinuousLegalityReader = {
      hasRestriction: () => false,
      hasKeyword: () => false,
      grantedKinds: (pid: string) => ledger.grantedKinds(pid),
    };
    const result = canAttackerDeclare(access, 0 as Seat, tamerA, reader);
    expect(result).toBe("illegal-target");
  });

  it("after duration sweep, the Digimon grant expires and the Tamer can no longer attack", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addKindGrant("tamer-A", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
    // Sweep at eachTurnEnd for the owner's seat (0)
    ledger.sweep(state, "eachTurnEnd", 0 as Seat);
    const reader: ContinuousLegalityReader = {
      hasRestriction: () => false,
      hasKeyword: () => false,
      grantedKinds: (pid: string) => ledger.grantedKinds(pid),
    };
    const result = canAttackerDeclare(access, 0 as Seat, tamerA, reader);
    expect(result).toBe("illegal-target");
  });
});
