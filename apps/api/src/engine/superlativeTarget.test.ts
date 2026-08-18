import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CompiledCard,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { CardSource } from "./effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "./effects/EffectContext.js";
import { irCardModule } from "./effects/interpreter.js";

/**
 * A3 for the superlative (highest/lowest play cost) target filter. Driven through the REAL
 * interpreter target resolver (candidatePermanents -> narrowToSuperlative): a Delete with a
 * `superlative` qualifier is resolved server-side; the ids handed to the fake `deletePermanent`
 * reveal which permanents the resolver kept.
 *
 *  - lowestPlayCost keeps ONLY the minimum-play-cost permanents (EX10-073 / BT25-076 Q6373).
 *  - highestPlayCost keeps ONLY the maxima (BT23-024).
 *  - ties keep all extrema; a pool with no play cost resolves empty (KB BT23-024 Q6025/Q6026).
 *
 * FAILS-WHEN-REVERTED: drop the superlative narrowing and the cost-5 becomes selectable under
 * lowestPlayCost => the "resolved only the cost-3" assertion goes RED (documented inline).
 */

let seq = 0;

function makeDefinition(cardId: string, playCost: number | undefined): CardDefinition {
  return {
    cardId,
    set: "X",
    nameEn: cardId,
    kinds: ["Digimon"],
    colors: [],
    playCost: playCost as number,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
  } as CardDefinition;
}

function makePermanent(cardId: string): Permanent {
  seq += 1;
  return {
    permanentId: `p-${cardId}-${seq}`,
    controllerSeat: 1 as Seat,
    topCard: { instanceId: `i-${seq}`, cardId, ownerSeat: 1 as Seat, faceUp: true } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 3000,
    currentDP: 3000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: "X-SRC",
    ownerSeat: 0 as Seat,
    definition: makeDefinition("X-SRC", 0),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

/** cardId -> play cost, for the test card DB. */
function makeContext(opts: {
  opponentBattleArea: Permanent[];
  costByCardId: Record<string, number | undefined>;
  resolvedIds: string[];
}): EffectContext {
  const opponent = opts.opponentBattleArea;
  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opponent, security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => opponent.find((p) => p.permanentId === id),
    definitionOf: (card) => makeDefinition(card.cardId, opts.costByCardId[card.cardId]),
    linkMax: () => 1,
  };
  const fx = {
    deletePermanent: async (ids: string[]) => {
      opts.resolvedIds.push(...ids);
      return ids.length;
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    // For ties: return ALL candidates the resolver offered (so the test sees the eligible pool).
    chooseTargets: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectCards: async (_ctx, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: makeSource(), trigger: {}, game, fx, ask, selections: new Map<string, string>() };
}

function deleteSuperlativeCompiled(superlative: "lowestPlayCost" | "highestPlayCost", count: number): CompiledCard {
  return {
    coverage: "full",
    effects: [
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative }, count },
          },
        ],
      },
    ],
  } as unknown as CompiledCard;
}

async function resolve(ctx: EffectContext, compiled: CompiledCard): Promise<void> {
  const effects = irCardModule(`X-SUP-${seq}`, compiled).effectsForTiming(EffectTiming.OnPlay, ctx.source);
  await effects[0]!.resolve(ctx);
}

describe("superlative target filter — lowestPlayCost / highestPlayCost", () => {
  it("lowestPlayCost resolves ONLY the minimum-cost opponent Digimon (cost-3 over cost-5)", async () => {
    const cost3 = makePermanent("C3");
    const cost5 = makePermanent("C5");
    const resolvedIds: string[] = [];
    const ctx = makeContext({
      opponentBattleArea: [cost5, cost3],
      costByCardId: { C3: 3, C5: 5 },
      resolvedIds,
    });
    await resolve(ctx, deleteSuperlativeCompiled("lowestPlayCost", 1));

    // FAILS-WHEN-REVERTED: drop narrowToSuperlative => both are candidates and the cost-5 (offered
    // by the prompt) can be resolved => this exact-equality assertion goes RED.
    expect(resolvedIds).toEqual([cost3.permanentId]);
  });

  it("highestPlayCost resolves ONLY the maximum-cost opponent Digimon (cost-5 over cost-3)", async () => {
    const cost3 = makePermanent("C3");
    const cost5 = makePermanent("C5");
    const resolvedIds: string[] = [];
    const ctx = makeContext({
      opponentBattleArea: [cost3, cost5],
      costByCardId: { C3: 3, C5: 5 },
      resolvedIds,
    });
    await resolve(ctx, deleteSuperlativeCompiled("highestPlayCost", 1));

    expect(resolvedIds).toEqual([cost5.permanentId]);
  });

  it("ties: lowestPlayCost keeps ALL minima (two cost-3 Digimon)", async () => {
    const a = makePermanent("A3");
    const b = makePermanent("B3");
    const high = makePermanent("C5");
    const resolvedIds: string[] = [];
    const ctx = makeContext({
      opponentBattleArea: [a, b, high],
      costByCardId: { A3: 3, B3: 3, C5: 5 },
      resolvedIds,
    });
    // count 2 so both minima resolve (the prompt offers exactly the two minima, not the cost-5).
    await resolve(ctx, deleteSuperlativeCompiled("lowestPlayCost", 2));

    expect(resolvedIds.sort()).toEqual([a.permanentId, b.permanentId].sort());
    expect(resolvedIds).not.toContain(high.permanentId);
  });

  it("a pool where NO candidate has a play cost resolves EMPTY (Q6025/Q6026)", async () => {
    const noCost = makePermanent("NC");
    const resolvedIds: string[] = [];
    const ctx = makeContext({
      opponentBattleArea: [noCost],
      costByCardId: { NC: undefined },
      resolvedIds,
    });
    await resolve(ctx, deleteSuperlativeCompiled("lowestPlayCost", 1));

    expect(resolvedIds).toEqual([]);
  });
});
