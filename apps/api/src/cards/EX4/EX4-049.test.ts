import { describe, expect, it } from "vitest";
import {
  CardKind,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-049.js";

function instance(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string, playCost: number): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Black"] as never,
    playCost,
    dp: 1000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

describe("EX4-049 CresGarurumon", () => {
  it("returns distinct selected opposing Digimon with combined play cost up to six to deck bottom", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = {
      permanentId: "self",
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const first = {
      permanentId: "first",
      topCard: instance("FIRST", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const second = {
      permanentId: "second",
      topCard: instance("SECOND", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [first, second], security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-049", definition("EX4-049", 12)],
      ["FIRST", definition("FIRST", 3)],
      ["SECOND", definition("SECOND", 3)],
    ]);
    const returned: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, first, second].find((permanent) => permanent.permanentId === id),
      definitionOf: (card: CardInstance) => definitions.get(card.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      returnToDeck: async (ids: string[]) => {
        returned.push(ids);
        return ids;
      },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    };
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-049")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);
    expect(returned).toEqual([[first.topCard!.instanceId, second.topCard!.instanceId]]);
  });

  it("digivolves another Digimon into a level-six-or-lower Greymon without paying", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = {
      permanentId: "self",
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const target = {
      permanentId: "target",
      topCard: instance("BASE", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const handCard = instance("GREYMON", 0);
    const players = [
      { battleArea: [self, target], security: [], hand: [handCard], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["EX4-049", definition("EX4-049", 12)],
      ["BASE", definition("BASE", 3)],
      ["GREYMON", { ...definition("GREYMON", 8), nameEn: "WarGreymon", level: 6 }],
    ]);
    const calls: unknown[] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, target].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-049")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { digivolveFromInstance: async (...args: unknown[]) => calls.push(args) } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 1,
        chooseTargets: async () => ["target"],
        selectCards: async () => [handCard.instanceId],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(calls[0]?.slice(0, 2)).toEqual(["target", handCard.instanceId]);
    expect(calls[0]?.[2]).toMatchObject({ payCost: false, ignoreRequirements: true });
  });

  it("only returns level-five-or-lower opposing Digimon for the inherited Omnimon effect", async () => {
    const self = {
      permanentId: "self",
      topCard: instance("OMNIMON", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const low = {
      permanentId: "low",
      topCard: instance("LOW", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const high = {
      permanentId: "high",
      topCard: instance("HIGH", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [low, high], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["OMNIMON", { ...definition("OMNIMON", 12), nameEn: "Omnimon Alter-S", level: 7 }],
      ["LOW", { ...definition("LOW", 5), nameEn: "WarGreymon", level: 5 }],
      ["HIGH", { ...definition("HIGH", 7), nameEn: "MetalGarurumon", level: 6 }],
    ]);
    const returned: string[][] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, low, high].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: defs.get("OMNIMON")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: {
        returnToDeck: async (ids: string[]) => {
          returned.push(ids);
          return ids;
        },
      } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 0,
        chooseTargets: async () => ["low"],
        selectCards: async () => [],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(returned).toEqual([[low.topCard!.instanceId]]);
  });
});
