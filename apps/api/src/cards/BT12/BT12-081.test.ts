import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-081.js";

// A3 for BT12-081 (Astamon):
//   [When Digivolving] You may play 1 level 4 or lower Digimon with ＜Save＞ from under a Tamer
//   without paying its cost.
//
// FAILS-WHEN-REVERTED: the declarative effect record encoded the PlayWithoutCost clause but the
// The Quartzmon branch used to be non-executable. More critically, the generated module
// which does NOT register to getEffectModule — so reverting removes the hand-written module
// and getEffectModule returns undefined, causing effectsForTiming to yield 0 effects at
// WhenDigivolving timing. The `playInstancesCalls` assertion proves the module is active.

function fakeDef(
  cardId: string,
  kind: CardKind = CardKind.Digimon,
  name = cardId,
  level?: number,
  hasSaveInText = false,
): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: name,
    kinds: [kind],
    colors: ["Purple"] as never,
    playCost: 4,
    dp: 4000,
    evoCosts: [],
    maxCountInDeck: 4,
    level,
    effectText: hasSaveInText ? "＜Save＞" : undefined,
  };
}

function makeTamerPerm(id: string, underCards: CardInstance[]): unknown {
  return {
    permanentId: id,
    controllerSeat: 0 as Seat,
    topCard: { cardId: `tamer-${id}`, instanceId: `top-${id}`, ownerSeat: 0 as Seat, faceUp: true },
    stack: underCards,
    linked: [],
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSelfPerm(stackSize: number): unknown {
  const stack = Array.from({ length: stackSize }, (_, i) => ({
    cardId: `stack-${i}`,
    instanceId: `s${i}`,
    ownerSeat: 0 as Seat,
    faceUp: true,
  }));
  return {
    permanentId: "self-perm",
    controllerSeat: 0 as Seat,
    topCard: { cardId: "BT12-081", instanceId: "inst-081", ownerSeat: 0 as Seat, faceUp: true },
    stack,
    linked: [],
    baseDP: 7000,
    currentDP: 7000,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSource(perm: unknown | undefined): CardSource {
  return {
    instanceId: "inst-081",
    cardId: "BT12-081",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT12-081"),
    permanent: () => perm as Permanent | undefined,
    isOnBattleArea: () => perm !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(opts: {
  playInstancesCalls: string[][];
  tamerPerm: unknown;
  selfPerm: unknown;
  saveCardUnderTamer: CardInstance;
}): EffectContext {
  const { playInstancesCalls, tamerPerm, selfPerm, saveCardUnderTamer } = opts;

  const players = [
    {
      battleArea: [tamerPerm, selfPerm],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
    { battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => {
      if (card.cardId === saveCardUnderTamer.cardId)
        return fakeDef(card.cardId, CardKind.Digimon, card.cardId, 4, true);
      if (card.cardId.startsWith("tamer-")) return fakeDef(card.cardId, CardKind.Tamer);
      return fakeDef(card.cardId);
    },
  };

  const fx = {
    playInstances: async (ids: string[], _opts?: unknown) => {
      playInstancesCalls.push(ids);
      return [];
    },
    digivolveFromInstance: async () => undefined,
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
    source,
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as unknown as EffectContext;
}

describe("BT12-081 Astamon [When Digivolving]", () => {
  it("calls playInstances with the ＜Save＞ Lv.4 card under the Tamer", async () => {
    const playInstancesCalls: string[][] = [];
    const saveCard: CardInstance = {
      cardId: "save-lv4",
      instanceId: "save-inst",
      ownerSeat: 0 as Seat,
      faceUp: true,
    } as CardInstance;
    const tamerPerm = makeTamerPerm("tamer-a", [saveCard]);
    const selfPerm = makeSelfPerm(0); // < 4 digivolution cards → only play-from-Tamer path

    const ctx = makeCtx({ playInstancesCalls, tamerPerm, selfPerm, saveCardUnderTamer: saveCard });

    const mod = getEffectModule("BT12-081");
    expect(mod).toBeDefined();

    const effects = mod!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource(selfPerm as Permanent));
    // FAILS-WHEN-REVERTED: the generated path doesn't register a hand-written module here.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    // A Save Lv.4 Digimon is under the Tamer; the player accepts → playInstances called.
    expect(playInstancesCalls).toHaveLength(1);
    expect(playInstancesCalls[0]).toContain(saveCard.instanceId);
  });

  it("[When Attacking] inherited effect is registered at OnAllyAttack timing", () => {
    const mod = getEffectModule("BT12-081");
    const effects = mod!.effectsForTiming(EffectTiming.OnAllyAttack, makeSource(undefined));
    expect(effects.length).toBeGreaterThan(0);
    expect(effects[0]!.isInherited).toBe(true);
  });
});
