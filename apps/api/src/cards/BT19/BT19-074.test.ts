import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT19-074.js";

function def(cardId: string, kinds: CardKind[]): CardDefinition {
  return { cardId, set: "TEST", nameEn: cardId, kinds, colors: ["Purple"] as never, playCost: 1, dp: 1000, level: 3, evoCosts: [], maxCountInDeck: 4 };
}

function instance(cardId: string, index: number): CardInstance {
  return { cardId, instanceId: `${cardId}-${index}`, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

describe("BT19-074 Beelzemon: Blast Mode", () => {
  it("returns 10 non-Digi-Egg cards from trash before trashing security", async () => {
    const nonEggs = Array.from({ length: 10 }, (_, i) => instance(`NON-EGG-${i}`, i));
    const egg = instance("EGG", 99);
    const self = { permanentId: "self", topCard: instance("BT19-074", 0), stack: [], linked: [], isSuspended: true, inBreeding: false } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [instance("SECURITY", 0)], hand: [], deck: [], trash: [...nonEggs, egg] },
      { battleArea: [], security: [instance("OPP-SECURITY", 0)], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["BT19-074", def("BT19-074", [CardKind.Digimon])],
      ...nonEggs.map((card) => [card.cardId, def(card.cardId, [CardKind.Digimon])] as const),
      ["EGG", def("EGG", [CardKind.DigiEgg])],
      ["SECURITY", def("SECURITY", [CardKind.Option])],
      ["OPP-SECURITY", def("OPP-SECURITY", [CardKind.Option])],
    ]);
    const returned: string[][] = [];
    const trashed: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
      definitionOf: (card: CardInstance) => definitions.get(card.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      returnToDeck: async (ids: string[]) => { returned.push(ids); return ids; },
      trash: async (ids: string[]) => { trashed.push(ids); return ids; },
      trashFromSecurity: async (seat: Seat, count: number) => {
        const ids = players[seat]!.security.slice(0, count).map((card) => card.instanceId);
        trashed.push(ids);
        return ids;
      },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
      chooseOption: async () => 0,
    };
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "BT19-074",
      ownerSeat: 0 as Seat,
      definition: definitions.get("BT19-074")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("BT19-074")!.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!;
    await effect.resolve(ctx);
    expect(returned).toHaveLength(1);
    expect(returned[0]).toHaveLength(10);
    expect(returned[0]).not.toContain(egg.instanceId);
    expect(trashed).toEqual([["OPP-SECURITY-0"]]);
  });
});
