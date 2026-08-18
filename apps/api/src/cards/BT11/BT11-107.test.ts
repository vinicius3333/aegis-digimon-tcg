import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-107.js";

// A3 for BT11-107 (StrikedraMon):
//   [Security] Delete 1 of your opponent's Digimon with the highest play cost.
//
// FAILS-WHEN-REVERTED: the declarative effect record had the [Security] delete as a compiled
// IR action (highest play cost filter), but [Main] remained inert. With the hand-written
// module, [Security] fires at SecuritySkill timing and calls deletePermanent on the highest
// play cost Digimon. Without this module, no effects are returned at SecuritySkill timing
// because the IR registered the Security action separately from the Module interface.

function fakeDef(cardId: string, kind: CardKind = CardKind.Digimon, playCost = 4): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Black"] as never,
    playCost,
    dp: kind === CardKind.Digimon ? playCost * 1000 : 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

type FakePerm = {
  permanentId: string;
  controllerSeat: Seat;
  topCard: { cardId: string; instanceId: string; ownerSeat: Seat; faceUp: boolean };
  stack: never[];
  linked: never[];
  baseDP: number;
  currentDP: number;
  isSuspended: boolean;
  inBreeding: boolean;
};

function fakePerm(id: string, playCost: number, seat: Seat): FakePerm {
  return {
    permanentId: id,
    controllerSeat: seat,
    topCard: { cardId: `card-${id}-cost${playCost}`, instanceId: `top-${id}`, ownerSeat: seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: playCost * 1000,
    currentDP: playCost * 1000,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "inst-107",
    cardId: "BT11-107",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT11-107", CardKind.Option),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(opts: {
  deletedIds: string[];
  oppBattleArea: FakePerm[];
  ownBattleArea?: FakePerm[];
  defFn?: (card: { cardId: string }) => CardDefinition;
}): EffectContext {
  const { deletedIds, oppBattleArea, ownBattleArea = [], defFn } = opts;

  const players = [
    { battleArea: ownBattleArea, security: [], hand: [], deck: [], trash: [] },
    { battleArea: oppBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf:
      defFn ??
      ((card: { cardId: string }) => {
        const match = card.cardId.match(/cost(\d+)$/);
        const cost = match ? parseInt(match[1]!, 10) : 4;
        return fakeDef(card.cardId, CardKind.Digimon, cost);
      }),
  };

  const fx = {
    deletePermanent: async (ids: string[], _cause?: string) => {
      deletedIds.push(...ids);
      return ids.length;
    },
    forceAttack: async () => {},
    changePlayCost: () => {},
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async (_ctx, _msg) => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async (_ctx, _choices) => 0,
  };

  return {
    source: makeSource(),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as unknown as EffectContext;
}

describe("BT11-107 Hades Force [Security]", () => {
  it("deletes the opponent Digimon with the highest play cost", async () => {
    const deletedIds: string[] = [];
    // Two opponent Digimon: one with cost 5, one with cost 8 (highest).
    const low = fakePerm("opp-low", 5, 1 as Seat);
    const high = fakePerm("opp-high", 8, 1 as Seat);
    const ctx = makeCtx({ deletedIds, oppBattleArea: [low, high] });

    const mod = getEffectModule("BT11-107");
    expect(mod).toBeDefined();

    const effects = mod!.effectsForTiming(EffectTiming.SecuritySkill, makeSource());
    expect(effects.length).toBeGreaterThan(0);
    expect(effects[0]!.isSecurity).toBe(true);

    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: without the hand-written module, SecuritySkill timing yields
    // no effects (registerIrCard is overridden by registerCard).
    expect(deletedIds).toContain(high.permanentId);
    expect(deletedIds).not.toContain(low.permanentId);
  });

  it("[Main] is registered at the Option-use timing", () => {
    const mod = getEffectModule("BT11-107");
    const effects = mod!.effectsForTiming(EffectTiming.OnUseOption, makeSource());
    expect(effects.length).toBeGreaterThan(0);
    expect(mod!.effectsForTiming(EffectTiming.OnPlay, makeSource())).toHaveLength(0);
  });
});

describe("BT11-107 Hades Force [Main]", () => {
  it("publishes the Greymon play-cost budget and deletes the chosen opposing cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-074", as: "greymon" }],
        hand: [{ card: "BT11-107", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low" },
          { card: "BT1-085", as: "tamer" },
          { card: "BT1-025", as: "high" },
        ],
      },
    });
    s.state.memory = 7;
    const greymonBudget = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const budgetSource = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: budgetSource.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("greymon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== budgetSource.decisionId,
    );

    const deletion = s.state.pendingDecision!;
    expect(deletion.kind).toBe("chooseTargets");
    expect(s.decisions.find(({ req }) => req.decisionId === deletion.decisionId)!.req.sourceCardId).toBe("BT11-107");
    expect(JSON.parse(deletion.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining([
        s.perm("low").permanentId,
        s.perm("tamer").permanentId,
        s.perm("high").permanentId,
      ]),
      min: 0,
      max: 3,
      maxTotalPlayCost: greymonBudget,
    });
    const selected = [s.perm("low").permanentId, s.perm("tamer").permanentId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletion.decisionId,
        response: { kind: "chooseTargets", instanceIds: selected },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      selected.every((id) => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === id)),
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("high").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const attack = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attack.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
  });
});
