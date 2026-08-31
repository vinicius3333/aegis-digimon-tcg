import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
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
import { compiled } from "./EX4-051.js";

function card(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Black"] as never,
    playCost: 5,
    dp: 1000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

describe("EX4-051 BlitzGreymon", () => {
  it("uses the compiled IR registration for all three When Digivolving modes", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "Modal",
      options: [
        [
          {
            kind: "DeDigivolve",
            target: { count: 3, forceSelection: true },
            amount: 1,
            condition: { kind: "opponentHas", countMin: 3 },
          },
        ],
        [{ kind: "Digivolve", payCost: false, from: ["hand"] }],
        [{ kind: "DnaDigivolve", payCost: true, materials: [{ count: 1 }, { count: 1 }] }],
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["MetalGreymon"], cost: 3, isAlternate: true },
    ]);
  });

  it("can De-Digivolve up to three opposing Digimon through modal option one", async () => {
    const selfCard = card("EX4-051", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const opponents = ["A", "B", "C"].map(
      (id) =>
        ({
          permanentId: id,
          controllerSeat: 1,
          topCard: card(id, 1),
          stack: [],
          linked: [],
          isSuspended: false,
          inBreeding: false,
        }) as unknown as Permanent,
    );
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: opponents, security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-051", definition("EX4-051")],
      ...opponents.map((p) => [p.topCard!.cardId, definition(p.topCard!.cardId)] as const),
    ]);
    const calls: Array<[string, number]> = [];
    const targetRequests: Array<{ min: number; max: number }> = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, ...opponents].find((permanent) => permanent.permanentId === id),
      definitionOf: (instance: CardInstance) => definitions.get(instance.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      deDigivolve: (id: string, amount: number) => {
        calls.push([id, amount]);
      },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => {
        targetRequests.push({ min: options.min, max: options.max });
        return options.candidates.slice(0, options.max);
      },
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    };
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-051",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-051")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("EX4-051")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);
    expect(calls).toEqual([
      ["A", 1],
      ["B", 1],
      ["C", 1],
    ]);
    expect(targetRequests).toEqual([{ min: 3, max: 3 }]);
  });

  it("does nothing when fewer than three opposing Digimon exist", async () => {
    const selfCard = card("EX4-051", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const opponents = ["A", "B"].map(
      (id) =>
        ({
          permanentId: id,
          controllerSeat: 1,
          topCard: card(id, 1),
          stack: [],
          linked: [],
          isSuspended: false,
          inBreeding: false,
        }) as unknown as Permanent,
    );
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: opponents, security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-051", definition("EX4-051")],
      ...opponents.map((p) => [p.topCard!.cardId, definition(p.topCard!.cardId)] as const),
    ]);
    const calls: string[] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat },
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, ...opponents].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => definitions.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-051",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-051")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-051")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { deDigivolve: (id: string) => calls.push(id) } as unknown as Primitives,
      ask: {
        chooseOption: async () => 0,
        chooseTargets: async () => [],
        selectCards: async () => [],
        selectPermanents: async () => [],
        optional: async () => true,
      },
    } as unknown as EffectContext);
    expect(calls).toEqual([]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-051");
    expect(s.state.players[0]!.hand.some((handCard) => handCard.instanceId === s.inst("subject").instanceId)).toBe(
      false,
    );
  });
  ex4CardBehaviorTests("EX4-051");
});
