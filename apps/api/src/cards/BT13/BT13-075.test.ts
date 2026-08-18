import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, EffectDuration, type CardDefinition, type CardInstance, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT13-075.js";

// A3 for BT13-075 (Alphamon)
// [On Play] By placing 1 Digimon card with the [X Antibody] or [Royal Knight] trait from your
//   trash as this Digimon's bottom digivolution card, all of your opponent's Digimon with a play
//   cost of 10 or higher can't attack players until the end of their turn.
// [When Digivolving] Same effect.
//
// FAILS-WHEN-REVERTED: the [On Play] and [When Digivolving] effects only use placeUnder + restrict
// in this hand-written module. The old IR carried a pre-encoded Restrict action that skipped the
// conditional-on-placing guard (the restriction applied even without a placement).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeAlphamon(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-075",
    set: "BT13",
    nameEn: "Alphamon",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 12,
    dp: 14000,
    level: 7,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeHighCostOppDigimon(): CardDefinition {
  return {
    cardId: "HIGH-COST-DIGI",
    set: "BT1",
    nameEn: "HighCostDigimon",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 12,
    dp: 10000,
    level: 6,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function fakeXAntibodyTrashDigi(): CardDefinition {
  return {
    cardId: "X-ANTI-TRASH",
    set: "BT6",
    nameEn: "XAntibodyCard",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 6,
    dp: 6000,
    level: 4,
    types: ["X Antibody"],
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  const selfPerm = { permanentId: "PERM#alphamon", topCard: { instanceId: "INST#BT13-075", cardId: "BT13-075", ownerSeat: 0 as Seat }, isSuspended: false, stack: [] };
  return {
    instanceId: "INST#BT13-075",
    cardId: "BT13-075",
    ownerSeat: 0 as Seat,
    definition: fakeAlphamon(),
    permanent: () => selfPerm as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Black,
    ...overrides,
  };
}

type FakePermanent = {
  permanentId: string;
  topCard: { instanceId: string; cardId: string; ownerSeat: Seat };
  isSuspended: boolean;
  stack: unknown[];
};

function makeContext(opts: {
  recorder: Recorder;
  seat0BattleArea?: FakePermanent[];
  seat0Trash?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  seat1BattleArea?: FakePermanent[];
  definitionMap?: Map<string, CardDefinition>;
  placeUnderResult?: CardInstance[];
}): EffectContext {
  const seat0Area = opts.seat0BattleArea ?? [];
  const seat0Trash = opts.seat0Trash ?? [];
  const seat1Area = opts.seat1BattleArea ?? [];
  const defMap = opts.definitionMap ?? new Map<string, CardDefinition>();

  const players = [
    { seat: 0, battleArea: seat0Area, security: [], hand: [], deck: [], trash: seat0Trash },
    { seat: 1, battleArea: seat1Area, security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) =>
      [...seat0Area, ...seat1Area].find((p) => p.permanentId === id) as never,
    definitionOf: (card) => {
      const def = defMap.get(card.cardId);
      if (def) return def;
      return fakeAlphamon({ cardId: card.cardId, nameEn: "Unknown" });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      if (verb === "placeUnder") return Promise.resolve(opts.placeUnderResult ?? []);
      return Promise.resolve([] as never);
    };

  const fx = {
    placeUnder: record("placeUnder"),
    restrict: record("restrict"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: makeSource(), trigger: {}, game, fx, ask };
}

describe("BT13-075 Alphamon", () => {
  const module = getEffectModule("BT13-075");

  it("is registered", () => {
    expect(module, "BT13-075 must self-register on import").toBeDefined();
  });

  it("routes [On Play] to OnPlay timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnPlay, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("routes [When Digivolving] to WhenDigivolving timing", () => {
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("[On Play] places trash card as digivolution and restricts high-cost opponent Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const xAntiDef = fakeXAntibodyTrashDigi();
    const trashCard = { instanceId: "INST#x-anti", cardId: xAntiDef.cardId, ownerSeat: 0 as Seat };
    const oppHighCostDef = fakeHighCostOppDigimon();
    const oppHighCostPerm: FakePermanent = {
      permanentId: "PERM#opp-high",
      topCard: { instanceId: "INST#opp-high", cardId: oppHighCostDef.cardId, ownerSeat: 1 as Seat },
      isSuspended: false,
      stack: [],
    };
    const alphaPerm: FakePermanent = {
      permanentId: "PERM#alphamon",
      topCard: { instanceId: "INST#BT13-075", cardId: "BT13-075", ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    };

    const defMap = new Map<string, CardDefinition>([
      [xAntiDef.cardId, xAntiDef],
      [oppHighCostDef.cardId, oppHighCostDef],
    ]);

    const ctx = makeContext({
      recorder,
      seat0BattleArea: [alphaPerm],
      seat0Trash: [trashCard],
      seat1BattleArea: [oppHighCostPerm],
      definitionMap: defMap,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.canActivate(ctx)).toBe(true);

    await effects[0]!.resolve(ctx);

    // Should place the X Antibody card as digivolution.
    const placeCalls = recorder.calls.filter((c) => c.verb === "placeUnder");
    expect(placeCalls.length).toBeGreaterThanOrEqual(1);
    expect((placeCalls[0]!.args[1] as string[]).includes("INST#x-anti")).toBe(true);

    // Should restrict the high-cost opponent Digimon from attacking players.
    const restrictCalls = recorder.calls.filter(
      (c) => c.verb === "restrict" && c.args[1] === "attackPlayers",
    );
    expect(restrictCalls.length).toBeGreaterThanOrEqual(1);
    expect(restrictCalls[0]!.args[0]).toBe("PERM#opp-high");
    expect(restrictCalls[0]!.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
  });

  it("[On Play] does NOT restrict if there is no eligible trash card (canActivate false)", () => {
    const recorder: Recorder = { calls: [] };
    // Trash has no X Antibody/Royal Knight Digimon.
    const ctx = makeContext({ recorder, seat0Trash: [] });
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });
});
