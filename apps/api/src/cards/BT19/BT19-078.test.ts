import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT19-078.js";

const seat = 0 as Seat;
function instance(cardId: string, index: number, ownerSeat: Seat = seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${index}`, ownerSeat, faceUp: true } as CardInstance;
}
function def(cardId: string, nameEn = cardId, kinds: CardKind[] = [CardKind.Digimon]): CardDefinition {
  return { cardId, set: "TEST", nameEn, kinds, colors: ["White"] as never, playCost: 1, dp: 1000, level: 5, evoCosts: [], maxCountInDeck: 4 };
}
function decisions(): DecisionApi {
  const api: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
    selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
    selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    chooseOption: async () => 0,
  };
  api.opponent = api;
  return api;
}

describe("BT19-078 ADR-01 Jeri", () => {
  it("applies -1000 DP per Mother D-Reaper digivolution card to one opposing Digimon", async () => {
    const mother = { permanentId: "mother", topCard: instance("MOTHER", 0), stack: [instance("STACK-1", 1), instance("STACK-2", 2)], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const target = { permanentId: "target", topCard: instance("TARGET", 0, 1), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const players = [{ battleArea: [mother], security: [], hand: [], deck: [], trash: [] }, { battleArea: [target], security: [], hand: [], deck: [], trash: [] }];
    const defs = new Map([["MOTHER", def("MOTHER", "Mother D-Reaper")], ["TARGET", def("TARGET")], ["BT19-078", def("BT19-078")], ["STACK-1", def("STACK-1")], ["STACK-2", def("STACK-2")]]);
    const game: GameAccess = { state: { memory: 0, players, turnSeat: seat } as unknown as GameState, player: (s: Seat) => players[s] as never, opponentOf: () => 1 as Seat, permanentById: () => undefined, definitionOf: (c: CardInstance) => defs.get(c.cardId)! } as unknown as GameAccess;
    const changes: number[] = [];
    const fx = { modifyDP: (_id: string, amount: number) => { changes.push(amount); } } as unknown as Primitives;
    const sourceCard = instance("BT19-078", 0);
    const source: CardSource = { instanceId: sourceCard.instanceId, cardId: "BT19-078", ownerSeat: seat, definition: defs.get("BT19-078")!, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true };
    const ctx = { source, trigger: {}, game, fx, ask: decisions() } as unknown as EffectContext;
    await getEffectModule("BT19-078")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.resolve(ctx);
    expect(changes).toEqual([-2000]);
  });

  it("places itself under an eligible Mother D-Reaper and redirects after inherited Jeri play", async () => {
    const jeri = instance("JERI", 1);
    const self = { permanentId: "self", topCard: instance("BT19-078", 0), stack: [jeri], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const mother = { permanentId: "mother", topCard: instance("MOTHER", 0), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const players = [{ battleArea: [self, mother], security: [], hand: [], deck: [], trash: [] }, { battleArea: [], security: [], hand: [], deck: [], trash: [] }];
    const defs = new Map([["MOTHER", def("MOTHER", "Mother D-Reaper")], ["BT19-078", def("BT19-078")], ["JERI", def("JERI", "ADR-01 Jeri")]]);
    const game: GameAccess = { state: { memory: 0, players, turnSeat: seat } as unknown as GameState, player: (s: Seat) => players[s] as never, opponentOf: () => 1 as Seat, permanentById: (id: string) => [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id), definitionOf: (c: CardInstance) => defs.get(c.cardId)! } as unknown as GameAccess;
    const relocated: string[][] = []; const redirected: string[][] = [];
    const fx = { relocatePermanent: async (destination: string, sourceId: string) => { relocated.push([destination, sourceId]); }, playInstances: async () => [{ permanentId: "played-jeri" }], redirectAttack: async (ids: string[]) => { redirected.push(ids); } } as unknown as Primitives;
    const source: CardSource = { instanceId: self.topCard!.instanceId, cardId: "BT19-078", ownerSeat: seat, definition: defs.get("BT19-078")!, permanent: () => self, isOnBattleArea: () => true, isOwnersTurn: () => false, hasColor: () => true };
    const ctx = { source, trigger: {}, game, fx, ask: decisions() } as unknown as EffectContext;
    await getEffectModule("BT19-078")!.effectsForTiming(EffectTiming.OnDeclaration, source)[0]!.resolve(ctx);
    await getEffectModule("BT19-078")!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!.resolve(ctx);
    expect(relocated).toEqual([["mother", "self"]]);
    expect(redirected).toEqual([["played-jeri"]]);
  });
});
