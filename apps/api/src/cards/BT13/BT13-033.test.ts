import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT13-033.js";

// A3 for BT13-033 (MirageGaogamon: Burst Mode)
// [When Digivolving] Return 1 of your opponent's Digimon to their hand. Then gain 1 memory
//   for every 4 cards in your opponent's hand.
// [When Attacking] If your opponent has 9+ cards in hand, by returning to the bottom of the
//   deck until 8 remain, unsuspend this Digimon.
//
// FAILS-WHEN-REVERTED: [When Attacking] unsuspend fires only after the return-to-deck cost is
// paid. With the old IR stub it called unsuspend unconditionally without the return cost.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDigimonDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-033",
    set: "BT13",
    nameEn: "MirageGaogamon: Burst Mode",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Blue],
    playCost: 14,
    dp: 13000,
    level: 7,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  const selfPermanent = { permanentId: "PERM#self", topCard: { instanceId: "INST#BT13-033", cardId: "BT13-033", ownerSeat: 0 as Seat }, isSuspended: true, stack: [] };
  return {
    instanceId: "INST#BT13-033",
    cardId: "BT13-033",
    ownerSeat: 0 as Seat,
    definition: fakeDigimonDef(),
    permanent: () => selfPermanent as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Blue,
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
  seat1BattleArea?: FakePermanent[];
  seat1Hand?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  definitionMap?: Map<string, CardDefinition>;
  returnToDeckResult?: string[];
}): EffectContext {
  const seat0Area = opts.seat0BattleArea ?? [];
  const seat1Area = opts.seat1BattleArea ?? [];
  const seat1Hand = opts.seat1Hand ?? [];
  const defMap = opts.definitionMap ?? new Map<string, CardDefinition>();

  const players = [
    { seat: 0, battleArea: seat0Area, security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: seat1Area, security: [], hand: seat1Hand, deck: [], trash: [] },
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
      return fakeDigimonDef({ cardId: card.cardId, nameEn: "Unknown" });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      if (verb === "returnToDeck") return Promise.resolve([]);
      if (verb === "returnToHand") return Promise.resolve([]);
      return Promise.resolve([] as never);
    };

  const fx = {
    returnToHand: record("returnToHand"),
    returnToDeck: record("returnToDeck"),
    gainMemory: record("gainMemory"),
    gainMemoryForSeat: record("gainMemoryForSeat"),
    unsuspend: record("unsuspend"),
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

describe("BT13-033 MirageGaogamon: Burst Mode", () => {
  const module = getEffectModule("BT13-033");

  it("is registered", () => {
    expect(module, "BT13-033 must self-register on import").toBeDefined();
  });

  it("routes [When Digivolving] to WhenDigivolving timing", () => {
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("routes [When Attacking] to OnAllyAttack timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnAllyAttack, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("[When Digivolving] returns 1 opponent Digimon to hand and gains memory per 4 hand cards", async () => {
    const recorder: Recorder = { calls: [] };
    const oppDigiDef = fakeDigimonDef({ cardId: "OPP-DIGI", nameEn: "OppDigimon" });
    const oppPermanent: FakePermanent = {
      permanentId: "PERM#opp",
      topCard: { instanceId: "INST#opp", cardId: oppDigiDef.cardId, ownerSeat: 1 as Seat },
      isSuspended: false,
      stack: [],
    };
    // 8 cards in opponent hand → floor(8/4) = 2 memory gain
    const oppHand = Array.from({ length: 8 }, (_, i) => ({
      instanceId: `hand-${i}`,
      cardId: "SOME-CARD",
      ownerSeat: 1 as Seat,
    }));
    const defMap = new Map<string, CardDefinition>([
      [oppDigiDef.cardId, oppDigiDef],
    ]);

    const ctx = makeContext({
      recorder,
      seat1BattleArea: [oppPermanent],
      seat1Hand: oppHand,
      definitionMap: defMap,
    });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    await effects[0]!.resolve(ctx);

    // Should call returnToHand with the opponent Digimon's instance.
    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToHand");
    expect(returnCalls.length).toBeGreaterThanOrEqual(1);

    // Should gain memory: floor(8/4) = 2 (hand count after bounce is still 8 in this mock).
    // [When Digivolving] is credited via gainMemoryForSeat(source.ownerSeat, ...), not the
    // seat-agnostic gainMemory (turnSeat could differ from this card's controller).
    const memoryCalls = recorder.calls.filter((c) => c.verb === "gainMemoryForSeat");
    expect(memoryCalls.length).toBeGreaterThanOrEqual(1);
    expect(memoryCalls[0]!.args[0]).toBe(0); // source.ownerSeat
    expect(memoryCalls[0]!.args[1] as number).toBeGreaterThanOrEqual(1);
  });

  it("[When Attacking] returns opponent hand cards to deck and unsuspends self when hand >= 9", async () => {
    const recorder: Recorder = { calls: [] };
    // 10 cards in opponent hand → returnCount = 10 - 8 = 2
    const oppHand = Array.from({ length: 10 }, (_, i) => ({
      instanceId: `hand-${i}`,
      cardId: "SOME-CARD",
      ownerSeat: 1 as Seat,
    }));

    const ctx = makeContext({
      recorder,
      seat1Hand: oppHand,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.canActivate(ctx)).toBe(true);

    await effects[0]!.resolve(ctx);

    // Should call returnToDeck.
    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(returnCalls.length).toBeGreaterThanOrEqual(1);
    // Should return exactly 2 cards (10 - 8).
    expect((returnCalls[0]!.args[0] as string[]).length).toBe(2);

    // Should unsuspend self.
    const unsuspendCalls = recorder.calls.filter((c) => c.verb === "unsuspend");
    expect(unsuspendCalls.length).toBeGreaterThanOrEqual(1);
    expect((unsuspendCalls[0]!.args[0] as string[]).includes("PERM#self")).toBe(true);
  });

  it("[When Attacking] canActivate is false when opponent has fewer than 9 hand cards", () => {
    const recorder: Recorder = { calls: [] };
    const oppHand = Array.from({ length: 8 }, (_, i) => ({
      instanceId: `hand-${i}`,
      cardId: "SOME-CARD",
      ownerSeat: 1 as Seat,
    }));

    const ctx = makeContext({ recorder, seat1Hand: oppHand });
    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, makeSource());
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });
});
