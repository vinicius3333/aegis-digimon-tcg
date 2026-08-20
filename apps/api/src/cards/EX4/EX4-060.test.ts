import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-060.js";

const card = (id: string, seat: Seat): CardInstance => ({ cardId: id, instanceId: `${id}-${seat}`, ownerSeat: seat, faceUp: true } as CardInstance);
const def = (id: string, level: number): CardDefinition => ({ cardId: id, set: "TEST", nameEn: id, kinds: [CardKind.Digimon], colors: ["White"] as never, playCost: 5, dp: 1000, level, evoCosts: [], maxCountInDeck: 4 });

describe("EX4-060 Omnimon Alter-S", () => {
  it("deletes an opposing Digimon at 8000 DP or less and returns a level six opponent to deck bottom", async () => {
    const self = { permanentId: "self", topCard: card("EX4-060", 0), stack: [], linked: [], isSuspended: false, inBreeding: false, currentDP: 15000 } as unknown as Permanent;
    const low = { permanentId: "low", topCard: card("LOW", 1), stack: [], linked: [], isSuspended: false, inBreeding: false, currentDP: 7000 } as unknown as Permanent;
    const high = { permanentId: "high", topCard: card("HIGH", 1), stack: [], linked: [], isSuspended: false, inBreeding: false, currentDP: 12000 } as unknown as Permanent;
    const players = [{ battleArea: [self], security: [], hand: [], deck: [], trash: [] }, { battleArea: [low, high], security: [], hand: [], deck: [], trash: [] }];
    const defs = new Map([["EX4-060", def("EX4-060", 7)], ["LOW", def("LOW", 5)], ["HIGH", def("HIGH", 6)]]);
    const deleted: unknown[] = []; const returned: unknown[] = [];
    const game: GameAccess = { state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState, player: (seat: Seat) => players[seat] as never, opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat, permanentById: (id: string) => [self, low, high].find((p) => p.permanentId === id), definitionOf: (c: CardInstance) => defs.get(c.cardId)! } as unknown as GameAccess;
    const fx = { deletePermanent: async (ids: string[]) => deleted.push(ids), returnToDeck: async (ids: string[], options: unknown) => returned.push([ids, options]) } as unknown as Primitives;
    const ask: DecisionApi = { optional: async () => true, chooseOption: async () => 0, chooseTargets: async (_ctx, options) => [options.candidates[0]!], selectCards: async () => [], selectPermanents: async () => [] };
    const source: CardSource = { instanceId: self.topCard!.instanceId, cardId: "EX4-060", ownerSeat: 0 as Seat, definition: defs.get("EX4-060")!, permanent: () => self, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true };
    const effect = getEffectModule("EX4-060")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);
    expect(deleted).toEqual([["low"]]);
    expect(returned).toEqual([[ ["high"], { toTop: false } ]]);
  });
});
