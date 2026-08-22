import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import "./BT12-083.js";

// A3 for BT12-083 (Arresterdramon: Superior Mode):
//   [End of Your Turn][Once Per Turn] If there are 4 or more digivolution cards under this
//   Digimon, you may attack with this Digimon without suspending it.
//
// FAILS-WHEN-REVERTED: the generated implementation did not execute this action.
// executed. With the hand-written module, `forceAttack` is called with `{withoutSuspending: true}`
// when the stack has 4+ cards. Without the module (IR path), getEffectModule returns undefined
// and effectsForTiming yields 0 effects at OnEndTurn timing. The `forceAttackCalls` assertion
// proves the end-of-turn attack is wired.

function fakeDef(cardId: string, kind: CardKind = CardKind.Digimon): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Purple"] as never,
    playCost: 5,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeStackedPerm(stackSize: number): unknown {
  const stack = Array.from({ length: stackSize }, (_, i) => ({
    cardId: `stack-${i}`,
    instanceId: `s${i}`,
    ownerSeat: 0 as Seat,
    faceUp: true,
  }));
  return {
    permanentId: "self-perm",
    controllerSeat: 0 as Seat,
    topCard: { cardId: "BT12-083", instanceId: "inst-083", ownerSeat: 0 as Seat, faceUp: true },
    stack,
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSource(perm?: unknown): CardSource {
  return {
    instanceId: "inst-083",
    cardId: "BT12-083",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT12-083"),
    permanent: () => perm as Permanent | undefined,
    isOnBattleArea: () => perm !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type ForceAttackCall = { permanentId: string; withoutSuspending?: boolean };

function makeCtx(opts: {
  forceAttackCalls: ForceAttackCall[];
  selfPerm: unknown;
  isOwnersTurn?: boolean;
}): EffectContext {
  const { forceAttackCalls, selfPerm, isOwnersTurn = true } = opts;

  const players = [
    { battleArea: [selfPerm], security: [], hand: [], deck: [], trash: [] },
    { battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  };

  const fx = {
    forceAttack: async (permanentId: string, opts?: { withoutSuspending?: boolean }) => {
      forceAttackCalls.push({ permanentId, withoutSuspending: opts?.withoutSuspending });
    },
    relocatePermanent: () => false,
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async (_ctx, _msg) => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async (_ctx, _choices) => 0,
  };

  const source = makeSource(selfPerm as Permanent);

  return {
    source: { ...source, isOwnersTurn: () => isOwnersTurn },
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as unknown as EffectContext;
}

describe("BT12-083 Arresterdramon: Superior Mode [End of Your Turn]", () => {
  it("registers the end-of-turn attack clause without a residual gap", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-083")!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(JSON.stringify(card)).not.toContain("RawUnparsed");
  });

  it("counts distinct Tamer colors for the level ceiling", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-083")!;
    const whenDigivolving = card.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "CostModifier",
      scaling: { per: 1, unit: "colors" },
    });
  });

  it("limits the Save alternate evolution to red, black, or purple level 4 cards", () => {
    expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT12-011")?.cost).toBe(4);
    expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT12-037")).toBeUndefined();
  });

  it("calls forceAttack(withoutSuspending: true) when stack has 4+ digivolution cards", async () => {
    const forceAttackCalls: ForceAttackCall[] = [];
    const selfPerm = makeStackedPerm(4); // exactly 4 cards

    const ctx = makeCtx({ forceAttackCalls, selfPerm });

    const mod = getEffectModule("BT12-083");
    expect(mod).toBeDefined();

    const effects = mod!.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm as Permanent));
    // FAILS-WHEN-REVERTED: no hand-written effect is registered at this timing.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    // forceAttack must be called with withoutSuspending: true.
    expect(forceAttackCalls).toHaveLength(1);
    expect(forceAttackCalls[0]!.withoutSuspending).toBe(true);
    expect(forceAttackCalls[0]!.permanentId).toBe("self-perm");
  });

  it("does NOT call forceAttack when stack has fewer than 4 digivolution cards", async () => {
    const forceAttackCalls: ForceAttackCall[] = [];
    const selfPerm = makeStackedPerm(3); // only 3 cards — below threshold

    const ctx = makeCtx({ forceAttackCalls, selfPerm });

    const mod = getEffectModule("BT12-083");
    const effects = mod!.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm as Permanent));

    // Effect should not activate (canActivate returns false for <4 cards).
    for (const eff of effects) {
      const canAct = eff.canActivate?.(ctx);
      if (canAct !== false) await eff.resolve(ctx);
    }

    expect(forceAttackCalls).toHaveLength(0);
  });

  it("[When Attacking] inherited draw effect is registered at attack timing", () => {
    const mod = getEffectModule("BT12-083");
    const effects = mod!.effectsForTiming(EffectTiming.OnUseAttack, makeSource());
    expect(effects.length).toBeGreaterThan(0);
    expect(effects[0]!.isInherited).toBe(true);
  });
});
