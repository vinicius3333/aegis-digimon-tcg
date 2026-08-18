import { describe, it, expect } from "vitest";
import { CardKind, EffectDuration, EffectTiming, type Seat } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT19-071.js";

// A3 for BT19-071 (Beelzemon, BT19):
//
//   [On Play] / [When Digivolving]: trash top 2 from own deck; this Digimon gains <Blocker>
//     until end of opponent's turn.
//   [All Turns][Once Per Turn]: when effects trash from own deck (onDiscardLibrary SubTrigger),
//     delete 1 opponent Lv.5 or lower Digimon.
//
// FAILS-WHEN-REVERTED:
//   - Remove OnPlay clause → trash/grantKeyword never called → trashCalls.length === 0.
//   - Remove None clause → no subscribeSubTrigger for onDiscardLibrary → subCalls.length === 0.

function fakeDef(cardId: string, kind = CardKind.Digimon, level?: number): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Purple"] as never,
    playCost: level !== undefined ? level : 7,
    dp: 12000,
    level,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeCard(cardId: string, seat: Seat): CardInstance {
  return {
    instanceId: `inst-${cardId}-${Math.random().toString(36).slice(2)}`,
    cardId,
    ownerSeat: seat,
    faceUp: true,
  } as CardInstance;
}

function makeSelfPerm(permanentId = "self-beelzemon"): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: makeCard("BT19-071", 0),
    stack: [],
    linked: [],
    baseDP: 12000,
    currentDP: 12000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(selfPerm: Permanent): CardSource {
  return {
    instanceId: selfPerm.topCard!.instanceId,
    cardId: "BT19-071",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT19-071"),
    permanent: () => selfPerm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type Call = { verb: string; args: unknown[] };

function makeCtx(opts: {
  calls: Call[];
  selfPerm: Permanent;
  ownerDeck?: CardInstance[];
  oppBattleArea?: Permanent[];
}): EffectContext {
  const { calls, selfPerm, ownerDeck = [makeCard("deck-1", 0), makeCard("deck-2", 0)], oppBattleArea = [] } = opts;

  const players = [
    { battleArea: [selfPerm], security: [], hand: [], deck: ownerDeck, trash: [] },
    { battleArea: oppBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId, CardKind.Digimon, 5),
  } as unknown as GameAccess;

  const fx = {
    trash: async (...a: unknown[]) => { calls.push({ verb: "trash", args: a }); },
    grantKeyword: (...a: unknown[]) => { calls.push({ verb: "grantKeyword", args: a }); },
    subscribeSubTrigger: (...a: unknown[]) => { calls.push({ verb: "subscribeSubTrigger", args: a }); },
    deletePermanent: async (...a: unknown[]) => { calls.push({ verb: "deletePermanent", args: a }); },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(selfPerm),
    trigger: {},
    game,
    fx,
    ask,
  } as unknown as EffectContext;
}

describe("BT19-071 Beelzemon (BT19)", () => {
  it("[On Play] trashes top 2 from deck and grants Blocker UntilOpponentTurnEnd", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm });

    const mod = getEffectModule("BT19-071");
    expect(mod).toBeDefined();
    const effects = mod!.effectsForTiming(EffectTiming.OnPlay, makeSource(selfPerm));
    // FAILS-WHEN-REVERTED: no OnPlay effect → no trash/grantKeyword calls.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    const trashCalls = calls.filter((c) => c.verb === "trash");
    expect(trashCalls).toHaveLength(1);
    // Trashes the top 2 cards by instanceId.
    expect((trashCalls[0]!.args[0] as string[]).length).toBe(2);

    const kwCalls = calls.filter((c) => c.verb === "grantKeyword");
    expect(kwCalls).toHaveLength(1);
    expect(kwCalls[0]!.args[1]).toBe("Blocker");
    expect(kwCalls[0]!.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
  });

  it("[When Digivolving] also trashes top 2 and grants Blocker (same body as OnPlay)", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm });

    const mod = getEffectModule("BT19-071")!;
    const effects = mod.effectsForTiming(EffectTiming.WhenDigivolving, makeSource(selfPerm));
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    expect(calls.filter((c) => c.verb === "trash")).toHaveLength(1);
    expect(calls.filter((c) => c.verb === "grantKeyword")).toHaveLength(1);
  });

  it("[On Play] does NOT trash when deck is empty (canActivate gate)", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm, ownerDeck: [] });

    const mod = getEffectModule("BT19-071")!;
    const effects = mod.effectsForTiming(EffectTiming.OnPlay, makeSource(selfPerm));
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    // With empty deck, the trash block is skipped.
    expect(calls.filter((c) => c.verb === "trash")).toHaveLength(0);
    // Blocker grant should still happen (the deck check only gates the trash, not the keyword).
    expect(calls.filter((c) => c.verb === "grantKeyword")).toHaveLength(1);
  });

  it("[None] registers onDiscardLibrary SubTrigger watcher for own-deck mill → delete opponent Lv.5-", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm });

    const mod = getEffectModule("BT19-071")!;
    const effects = mod.effectsForTiming(EffectTiming.None, makeSource(selfPerm));
    // FAILS-WHEN-REVERTED: no None effect → subscribeSubTrigger never called.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    const subCalls = calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subCalls).toHaveLength(1);
    const sub = subCalls[0]!.args[0] as { event?: string };
    expect(sub.event).toBe("onDiscardLibrary");
  });
});
