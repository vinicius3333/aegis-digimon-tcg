import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT18-069.js";

// A3 for BT18-069 (Knightmon) — [End of Opponent's Turn][Once Per Turn]:
//   "You may choose 1 of your opponent's Digimon. Your opponent attacks with the chosen Digimon."
//
// KB rulings: Q3005 (choosing is optional), Q3006 (no-op if can't attack), Q3007 (no nested attack).
//
// FAILS-WHEN-REVERTED: the RawUnparsed forced-attack clause is removed → effectsForTiming returns
// 0 effects at OnEndTurn → `forceAttack` is never called → the assertion `forceAttackCalls.length === 1`
// goes RED.

function fakeDef(cardId: string, kind: CardKind = CardKind.Digimon): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Black"] as never,
    playCost: 7,
    dp: 10000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSelfPerm(permanentId = "self-knightmon"): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: { cardId: "BT18-069", instanceId: "inst-069", ownerSeat: 0 as Seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 10000,
    currentDP: 10000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeOppDigimon(permanentId = "opp-digimon"): Permanent {
  return {
    permanentId,
    controllerSeat: 1 as Seat,
    topCard: { cardId: "BT1-009", instanceId: "inst-opp", ownerSeat: 1 as Seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 4000,
    currentDP: 4000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(selfPerm: Permanent, isOpponentTurn = true): CardSource {
  return {
    instanceId: "inst-069",
    cardId: "BT18-069",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT18-069"),
    permanent: () => selfPerm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => !isOpponentTurn,
    hasColor: () => false,
  };
}

function makeCtx(opts: {
  forceAttackCalls: string[];
  selfPerm: Permanent;
  oppDigimon?: Permanent;
  isOpponentTurn?: boolean;
}): EffectContext {
  const { forceAttackCalls, selfPerm, isOpponentTurn = true } = opts;
  const oppDigimon = opts.oppDigimon ?? makeOppDigimon();

  const players = [
    { battleArea: [selfPerm], security: [], hand: [], deck: [], trash: [] },
    { battleArea: [oppDigimon], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: (isOpponentTurn ? 1 : 0) as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  } as unknown as GameAccess;

  const fx = {
    forceAttack: async (permanentId: string) => {
      forceAttackCalls.push(permanentId);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    // Always pick first candidate (simulates choosing the opponent Digimon).
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  const source = makeSource(selfPerm, isOpponentTurn);

  return {
    source,
    trigger: {},
    game,
    fx,
    ask,
  } as unknown as EffectContext;
}

describe("BT18-069 Knightmon [End of Opponent's Turn] — force-attack chosen Digimon", () => {
  it("registers an OnEndTurn effect with the module", () => {
    const mod = getEffectModule("BT18-069");
    expect(mod).toBeDefined();
    // FAILS-WHEN-REVERTED: RawUnparsed → 0 effects at OnEndTurn.
    const effects = mod!.effectsForTiming(EffectTiming.OnEndTurn, makeSource(makeSelfPerm()));
    expect(effects.length).toBeGreaterThan(0);
  });

  it("calls forceAttack with the chosen opponent Digimon's permanentId (opponent's turn)", async () => {
    const forceAttackCalls: string[] = [];
    const selfPerm = makeSelfPerm();
    const oppDigimon = makeOppDigimon("opp-digimon-1");
    const ctx = makeCtx({ forceAttackCalls, selfPerm, oppDigimon });

    const mod = getEffectModule("BT18-069")!;
    const effects = mod.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm, true));
    expect(effects.length).toBeGreaterThan(0);

    // Manually invoke resolve (bypasses engine timing; direct effect unit test).
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: forceAttack is never called when the clause is missing.
    expect(forceAttackCalls).toHaveLength(1);
    expect(forceAttackCalls[0]).toBe("opp-digimon-1");
  });

  it("canTrigger() returns false on controller's own turn (gated off)", () => {
    const forceAttackCalls: string[] = [];
    const selfPerm = makeSelfPerm();
    // isOpponentTurn=false: turnSeat=0, ownerSeat=0 → [End of Opponent's Turn] gate fires false.
    const ctx = makeCtx({ forceAttackCalls, selfPerm, isOpponentTurn: false });

    const mod = getEffectModule("BT18-069")!;
    const effects = mod.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm, false));
    expect(effects.length).toBeGreaterThan(0);

    // FAILS-WHEN-REVERTED: without the `when` guard, canTrigger returns true on own turn.
    for (const eff of effects) {
      expect(eff.canTrigger(ctx)).toBe(false);
    }
  });

  it("registers an inherited ESS at EffectTiming.None (DP +2000 for Knightmon)", () => {
    const mod = getEffectModule("BT18-069")!;
    const selfPerm = makeSelfPerm();
    const effects = mod.effectsForTiming(EffectTiming.None, makeSource(selfPerm));
    expect(effects.some((e) => e.isInherited === true)).toBe(true);
  });
});
