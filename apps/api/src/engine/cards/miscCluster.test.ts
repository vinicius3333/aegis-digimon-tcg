import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../effects/registry.js";
import type { CardSource } from "../effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../effects/EffectContext.js";
// Boot side-effect: register the misc cluster's hand-written override modules.
import "../../cards/BT22/BT22-067.js";
import "../../cards/BT7/BT7-004.js";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 6,
    dp: 6000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(permanentId: string, seat: Seat, cardId: string, dp = 5000): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: dp,
    currentDP: dp,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#misc",
    cardId: "X",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  } as unknown as CardSource;
}

function makeContext(opts: {
  recorder: Recorder;
  sourceCardId: string;
  ownerSeat?: Seat;
  ownerBattleArea?: Permanent[];
  ownerDeck?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  revealReturns?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  sourcePermanent?: () => Permanent | undefined;
}): EffectContext {
  const {
    recorder,
    sourceCardId,
    ownerSeat = 0 as Seat,
    ownerBattleArea = [],
    ownerDeck = [],
    revealReturns = [],
    sourcePermanent = () => undefined,
  } = opts;

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const players = [
    {
      seat: 0 as Seat,
      battleArea: ownerSeat === 0 ? ownerBattleArea : [],
      security: [],
      hand: [],
      deck: ownerSeat === 0 ? ownerDeck : [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      battleArea: ownerSeat === 1 ? ownerBattleArea : [],
      security: [],
      hand: [],
      deck: ownerSeat === 1 ? ownerDeck : [],
      trash: [],
    },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) => ownerBattleArea.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) =>
      fakeDefinition({ cardId: card.cardId, nameEn: card.cardId, kinds: ["Digimon"] as never }),
  } as unknown as GameAccess;

  const fx: Primitives = {
    modifyDP: record("modifyDP"),
    grantKeyword: record("grantKeyword"),
    forceAttack: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "forceAttack", args });
    },
    reveal: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "reveal", args });
      return revealReturns as never;
    },
    returnToDeck: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "returnToDeck", args });
      return [] as never;
    },
    trash: record("trash"),
    playInstances: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playInstances", args });
      return [] as never;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => false, // decline the optional "may attack" / second-step prompts
    chooseTargets: async (_c: unknown, o: { candidates: unknown[]; max: number }) => o.candidates.slice(0, o.max),
    selectCards: async (_c: unknown, o: { candidates: unknown[]; max: number }) => o.candidates.slice(0, o.max),
    chooseOption: async () => 1, // "bottom" for BT7-004
  } as unknown as DecisionApi;

  return {
    source: makeSource({
      cardId: sourceCardId,
      ownerSeat,
      definition: fakeDefinition({ cardId: sourceCardId }),
      permanent: sourcePermanent,
    }),
    trigger: {},
    game,
    fx,
    ask,
  } as unknown as EffectContext;
}

describe("A3 misc cluster — BT22-067 [On Play] +3000 DP", () => {
  it("buffs 1 of your Digimon by +3000 DP until opponent's turn end", async () => {
    const recorder: Recorder = { calls: [] };
    const buff = makePermanent("perm-buff", 0, "AD1-001", 5000);
    const self = makePermanent("perm-lord", 0, "BT22-067", 6000);
    const ctx = makeContext({
      recorder,
      sourceCardId: "BT22-067",
      ownerBattleArea: [self, buff],
      sourcePermanent: () => self,
    });

    const module = getEffectModule("BT22-067");
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, ctx.source);
    expect(effects.length).toBeGreaterThan(0);
    for (const effect of effects) await effect.resolve(ctx);

    const dp = recorder.calls.find((c) => c.verb === "modifyDP");
    // FAILS-WHEN-REVERTED: removing the modifyDP(+3000) call makes this assertion RED.
    expect(dp, "BT22-067 [On Play] must call modifyDP(+3000)").toBeDefined();
    expect(dp!.args[1]).toBe(3000);
  });
});

describe("A3 misc cluster — BT7-004 [When Attacking] reveal-and-reorder", () => {
  it("reveals the top card and returns it to the deck (top or bottom)", async () => {
    const recorder: Recorder = { calls: [] };
    const topCard = { instanceId: "deck-top", cardId: "AD1-001", ownerSeat: 0 as Seat };
    const self = makePermanent("perm-koro", 0, "BT7-004", 1000);
    const ctx = makeContext({
      recorder,
      sourceCardId: "BT7-004",
      ownerDeck: [topCard, { instanceId: "deck-2", cardId: "AD1-002", ownerSeat: 0 }],
      revealReturns: [topCard],
      sourcePermanent: () => self,
    });

    const module = getEffectModule("BT7-004");
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, ctx.source);
    expect(effects.length).toBeGreaterThan(0);
    for (const effect of effects) await effect.resolve(ctx);

    expect(recorder.calls.some((c) => c.verb === "reveal")).toBe(true);
    const ret = recorder.calls.find((c) => c.verb === "returnToDeck");
    // FAILS-WHEN-REVERTED: removing the returnToDeck call makes this assertion RED.
    expect(ret, "BT7-004 [When Attacking] must call returnToDeck").toBeDefined();
    expect(ret!.args[0]).toEqual(["deck-top"]);
  });
});
