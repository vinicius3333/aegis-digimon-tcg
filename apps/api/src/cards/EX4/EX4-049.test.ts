import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-049.js";

function instance(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string, playCost: number): CardDefinition {
  return { cardId, set: "TEST", nameEn: cardId, kinds: [CardKind.Digimon], colors: ["Black"] as never, playCost, dp: 1000, level: 5, evoCosts: [], maxCountInDeck: 4 };
}

describe("EX4-049 CresGarurumon", () => {
  it("returns distinct selected opposing Digimon with combined play cost up to six to deck bottom", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = { permanentId: "self", topCard: selfCard, stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const first = { permanentId: "first", topCard: instance("FIRST", 1), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const second = { permanentId: "second", topCard: instance("SECOND", 1), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const players = [{ battleArea: [self], security: [], hand: [], deck: [], trash: [] }, { battleArea: [first, second], security: [], hand: [], deck: [], trash: [] }];
    const definitions = new Map<string, CardDefinition>([["EX4-049", definition("EX4-049", 12)], ["FIRST", definition("FIRST", 3)], ["SECOND", definition("SECOND", 3)]]);
    const returned: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, first, second].find((permanent) => permanent.permanentId === id),
      definitionOf: (card: CardInstance) => definitions.get(card.cardId)!,
    } as unknown as GameAccess;
    const fx = { returnToDeck: async (ids: string[]) => { returned.push(ids); return ids; } } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    };
    const source: CardSource = { instanceId: selfCard.instanceId, cardId: "EX4-049", ownerSeat: 0 as Seat, definition: definitions.get("EX4-049")!, permanent: () => self, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);
    expect(returned).toEqual([[first.permanentId, second.permanentId]]);
  });
});
