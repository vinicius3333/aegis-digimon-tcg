import { describe, it, expect } from "vitest";
import { CardColor, EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT4-030.js";

// A3 for BT4-030 (Beowolfmon):
//   ＜Jamming＞
//   [Opponent's Turn] If this Digimon's digivolution cards include a Digimon card with [Hybrid]
//   in its form or a blue Tamer card, it can't be attacked.
//
// KB Q1195: "can't be attacked" = can't be targeted by opponent's attacks.
// KB Q1197: a [Hybrid] form Digimon OR blue Tamer card in digivolution stack triggers the guard.
//
// FAILS-WHEN-REVERTED: the cantBeAttacked restrict call only fires when the digivolution card
// condition is met AND it is the opponent's turn. The dedicated module makes the formerly
// unstructured restriction executable.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

type StackCard = { instanceId: string; cardId: string; ownerSeat: Seat; faceUp: boolean };

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT4-030",
    set: "BT4",
    nameEn: "Beowolfmon",
    kinds: ["Digimon"] as never,
    colors: ["Blue"] as never,
    playCost: 13,
    dp: 12000,
    level: 6,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(stack: StackCard[] = []): Permanent {
  return {
    permanentId: "SELF-PERM",
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "self-top", cardId: "BT4-030", ownerSeat: 0 as Seat, faceUp: true } as never,
    stack: stack as never,
    linked: [] as never,
    baseDP: 12000,
    currentDP: 12000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(opts: { perm?: Permanent; isOpponentsTurn?: boolean } = {}): CardSource {
  const perm = opts.perm ?? makePermanent();
  return {
    instanceId: "self-top",
    cardId: "BT4-030",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => !(opts.isOpponentsTurn ?? false),
    hasColor: (c) => c === CardColor.Blue,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  source: CardSource;
  cardDefs?: Map<string, Partial<CardDefinition>>;
}): EffectContext {
  const rec = opts.recorder;
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      rec.calls.push({ verb, args });
      return undefined as never;
    };

  const defs = opts.cardDefs ?? new Map();

  const game: GameAccess = {
    state: { memory: 3, players: [], turnSeat: 0 as Seat } as never,
    player: (seat: Seat) =>
      ({ seat, battleArea: [], security: [], hand: [], deck: [], trash: [] }) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => {
      const over = defs.get(card.cardId);
      return fakeDefinition({ ...over, cardId: card.cardId });
    },
  };

  const fx = {
    grantKeyword: record("grantKeyword"),
    restrict: record("restrict"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: opts.source, trigger: {}, game, fx, ask };
}

describe("BT4-030 Beowolfmon", () => {
  const module = getEffectModule("BT4-030");

  it("is registered on import", () => {
    expect(module, "BT4-030 must self-register on import").toBeDefined();
  });

  it("produces static (None) effects for Jamming and cantBeAttacked", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects.length).toBeGreaterThanOrEqual(2);
  });

  it("produces no effects for OnPlay timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[Static] grants Jamming keyword on the permanent", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source });
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    for (const effect of effects) await effect.resolve(ctx);
    const jammingCalls = recorder.calls.filter(
      (c) => c.verb === "grantKeyword" && c.args[1] === "Jamming",
    );
    expect(jammingCalls.length).toBeGreaterThanOrEqual(1);
  });

  it(
    "[Opponent's Turn] restricts cantBeAttacked when divo stack has a Hybrid Digimon card",
    async () => {
      const stackCard: StackCard = {
        instanceId: "divo-hybrid",
        cardId: "BT4-010",
        ownerSeat: 0 as Seat,
        faceUp: true,
      };
      const cardDefs = new Map<string, Partial<CardDefinition>>([
        [
          "BT4-010",
          {
            kinds: ["Digimon"] as never,
            forms: ["Hybrid"] as never,
            colors: ["Blue"] as never,
          },
        ],
      ]);
      const perm = makePermanent([stackCard]);
      const source = makeSource({ perm, isOpponentsTurn: true });
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({ recorder, source, cardDefs });

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      const cantBeAttackedEffect = effects.find((e) => e.effectKey.includes("cant-be-attacked"));
      expect(cantBeAttackedEffect).toBeDefined();

      // The canTrigger when gate must pass (opponent's turn + Hybrid in stack)
      expect(cantBeAttackedEffect!.canTrigger(ctx)).toBe(true);

      await cantBeAttackedEffect!.resolve(ctx);

      const restrictCalls = recorder.calls.filter(
        (c) => c.verb === "restrict" && c.args[1] === "cantBeAttacked",
      );
      // FAILS-WHEN-REVERTED: removing the dedicated restriction never calls restrict.
      expect(restrictCalls).toHaveLength(1);
    },
  );

  it(
    "[Opponent's Turn] restricts cantBeAttacked when divo stack has a Blue Tamer card",
    async () => {
      const stackCard: StackCard = {
        instanceId: "divo-tamer",
        cardId: "BT4-050",
        ownerSeat: 0 as Seat,
        faceUp: true,
      };
      const cardDefs = new Map<string, Partial<CardDefinition>>([
        [
          "BT4-050",
          {
            kinds: ["Tamer"] as never,
            colors: ["Blue"] as never,
            forms: [] as never,
          },
        ],
      ]);
      const perm = makePermanent([stackCard]);
      const source = makeSource({ perm, isOpponentsTurn: true });
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({ recorder, source, cardDefs });

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      const cantBeAttackedEffect = effects.find((e) => e.effectKey.includes("cant-be-attacked"));
      expect(cantBeAttackedEffect).toBeDefined();
      expect(cantBeAttackedEffect!.canTrigger(ctx)).toBe(true);

      await cantBeAttackedEffect!.resolve(ctx);

      const restrictCalls = recorder.calls.filter(
        (c) => c.verb === "restrict" && c.args[1] === "cantBeAttacked",
      );
      expect(restrictCalls).toHaveLength(1);
    },
  );

  it(
    "[Opponent's Turn] does NOT restrict when divo stack has no qualifying card",
    () => {
      const stackCard: StackCard = {
        instanceId: "divo-plain",
        cardId: "BT4-005",
        ownerSeat: 0 as Seat,
        faceUp: true,
      };
      // Non-Hybrid Red Digimon
      const cardDefs = new Map<string, Partial<CardDefinition>>([
        [
          "BT4-005",
          {
            kinds: ["Digimon"] as never,
            colors: ["Red"] as never,
            forms: ["Child"] as never,
          },
        ],
      ]);
      const perm = makePermanent([stackCard]);
      const source = makeSource({ perm, isOpponentsTurn: true });
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({ recorder, source, cardDefs });

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      const cantBeAttackedEffect = effects.find((e) => e.effectKey.includes("cant-be-attacked"));
      expect(cantBeAttackedEffect).toBeDefined();

      // The when gate must FAIL (no qualifying card in stack)
      expect(cantBeAttackedEffect!.canTrigger(ctx)).toBe(false);
    },
  );

  it(
    "[Opponent's Turn] does NOT restrict cantBeAttacked on owner's turn (even with Hybrid divo)",
    () => {
      const stackCard: StackCard = {
        instanceId: "divo-hybrid2",
        cardId: "BT4-010",
        ownerSeat: 0 as Seat,
        faceUp: true,
      };
      const cardDefs = new Map<string, Partial<CardDefinition>>([
        [
          "BT4-010",
          {
            kinds: ["Digimon"] as never,
            colors: ["Blue"] as never,
            forms: ["Hybrid"] as never,
          },
        ],
      ]);
      const perm = makePermanent([stackCard]);
      // owner's turn → isOpponentsTurn: false
      const source = makeSource({ perm, isOpponentsTurn: false });
      const recorder: Recorder = { calls: [] };
      const ctx = makeContext({ recorder, source, cardDefs });

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      const cantBeAttackedEffect = effects.find((e) => e.effectKey.includes("cant-be-attacked"));
      expect(cantBeAttackedEffect).toBeDefined();

      expect(cantBeAttackedEffect!.canTrigger(ctx)).toBe(false);
    },
  );
});
