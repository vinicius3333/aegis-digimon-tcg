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
    const reader: ContinuousLegalityReader = {
      hasRestriction: () => false,
      hasKeyword: () => false,
      grantedKinds: (pid: string) => ledger.grantedKinds(pid),
    };
    const result = canAttackerDeclare(access, 1 as Seat, tamerB, reader);
    expect(result).toBe("illegal-target");
  });

  it("FAILS-WHEN-REVERTED: without grantKind, Tamer A also cannot attack", () => {
    const ledger = new ContinuousEffectLedger();
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
