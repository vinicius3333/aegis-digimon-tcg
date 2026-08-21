import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT19-075.js";

function card(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string, kinds: CardKind[], level?: number): CardDefinition {
  return { cardId, set: "TEST", nameEn: cardId, kinds, colors: ["Purple"] as never, playCost: 1, dp: 1000, level, evoCosts: [], maxCountInDeck: 4 };
}

describe("BT19-075 MoonMillenniummon", () => {
  it("deletes one opponent Tamer for each two cards actually trashed from their hand", async () => {
    const sourceCard = card("BT19-075", 0 as Seat);
    const self = { permanentId: "self", topCard: sourceCard, stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const opponentHand = Array.from({ length: 7 }, (_, i) => card(`HAND-${i}`, 1 as Seat));
    const opponentTamers = Array.from({ length: 3 }, (_, i) => ({
      permanentId: `tamer-${i}`,
      topCard: card(`TAMER-${i}`, 1 as Seat),
      stack: [], linked: [], isSuspended: false, inBreeding: false,
    } as unknown as Permanent));
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: opponentTamers, security: [], hand: opponentHand, deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["BT19-075", definition("BT19-075", [CardKind.Digimon], 7)],
      ...opponentHand.map((c) => [c.cardId, definition(c.cardId, [CardKind.Option])] as const),
      ...opponentTamers.map((p) => [p.topCard!.cardId, definition(p.topCard!.cardId, [CardKind.Tamer])] as const),
    ]);
    const deleted: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      // Return the moved instances so the interpreter can bind the actual count
      // used by the per-two-cards scaling clause.
      trash: async (ids: string[]) => ids,
      deletePermanent: async (ids: string[]) => { deleted.push(ids); return ids; },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
      chooseOption: async () => 0,
    };
    ask.opponent = {
      optional: ask.optional,
      chooseTargets: ask.chooseTargets,
      selectCards: ask.selectCards,
      selectPermanents: ask.selectPermanents,
      chooseOption: ask.chooseOption,
    };
    const source: CardSource = {
      instanceId: sourceCard.instanceId,
      cardId: "BT19-075",
      ownerSeat: 0 as Seat,
      definition: defs.get("BT19-075")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("BT19-075")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    await effect.resolve(ctx);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toHaveLength(1);
    expect(deleted[0]![0]).toBe("tamer-0");
  });
});
