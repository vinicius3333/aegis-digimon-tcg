import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-059.js";

const card = (id: string, seat: Seat): CardInstance => ({ cardId: id, instanceId: `${id}-${seat}`, ownerSeat: seat, faceUp: true } as CardInstance);
const def = (id: string): CardDefinition => ({ cardId: id, set: "TEST", nameEn: id, kinds: [CardKind.Digimon], colors: ["Purple"] as never, playCost: 5, dp: 1000, level: 5, evoCosts: [], maxCountInDeck: 4 });

describe("EX4-059 Cherubimon", () => {
  it("suspends another Digimon and binds its DP plus Piercing to the attack", async () => {
    const self = { permanentId: "self", topCard: card("EX4-059", 0), stack: [], linked: [], isSuspended: false, inBreeding: false, currentDP: 7000 } as unknown as Permanent;
    const ally = { permanentId: "ally", topCard: card("ALLY", 0), stack: [], linked: [], isSuspended: false, inBreeding: false, currentDP: 4000 } as unknown as Permanent;
    const players = [{ battleArea: [self, ally], security: [], hand: [], deck: [], trash: [] }, { battleArea: [], security: [], hand: [], deck: [], trash: [] }];
    const defs = new Map([["EX4-059", def("EX4-059")], ["ALLY", def("ALLY")]]);
    const calls: unknown[] = [];
    const game: GameAccess = { state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState, player: (seat: Seat) => players[seat] as never, opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat, permanentById: (id: string) => [self, ally].find((p) => p.permanentId === id), definitionOf: (c: CardInstance) => defs.get(c.cardId)! } as unknown as GameAccess;
    const fx = { suspend: async (ids: string[]) => calls.push(["suspend", ids]), modifyDP: (...args: unknown[]) => calls.push(["modifyDP", ...args]), grantKeyword: (...args: unknown[]) => calls.push(["keyword", ...args]) } as unknown as Primitives;
    const ask: DecisionApi = { optional: async () => true, chooseOption: async () => 0, chooseTargets: async () => ["ally"], selectCards: async () => [], selectPermanents: async () => [] };
    const source: CardSource = { instanceId: self.topCard!.instanceId, cardId: "EX4-059", ownerSeat: 0 as Seat, definition: defs.get("EX4-059")!, permanent: () => self, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true };
    const effect = getEffectModule("EX4-059")!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);
    expect(calls[0]).toEqual(["suspend", ["ally"]]);
    expect(calls.some((call) => Array.isArray(call) && call[0] === "keyword" && call[1] === "self" && call[2] === "Piercing")).toBe(true);
  });
});
