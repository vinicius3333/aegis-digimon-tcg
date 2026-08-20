import { describe, expect, it } from "vitest";
import { CardColor, CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-068.js";

const card = (id: string, seat: Seat): CardInstance => ({ cardId: id, instanceId: `${id}-${seat}`, ownerSeat: seat, faceUp: true } as CardInstance);
const definition = (id: string, colors: CardColor[]): CardDefinition => ({ cardId: id, set: "TEST", nameEn: id, kinds: [CardKind.Digimon], colors, playCost: 4, dp: 1000, level: 5, evoCosts: [], maxCountInDeck: 4 });

describe("EX4-068 Heaven's Judgement", () => {
  it("activates -6000 once for the base effect plus once per distinct own Digimon color", async () => {
    const selfCard = card("EX4-068", 0);
    const self = { permanentId: "self", topCard: selfCard, stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const own = { permanentId: "own", topCard: card("OWN", 0), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const opp = { permanentId: "opp", topCard: card("OPP", 1), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const players = [{ battleArea: [self, own], security: [], hand: [], deck: [], trash: [] }, { battleArea: [opp], security: [], hand: [], deck: [], trash: [] }];
    const defs = new Map([["EX4-068", { ...definition("EX4-068", [CardColor.Yellow]), kinds: [CardKind.Option] }], ["OWN", definition("OWN", [CardColor.Red, CardColor.Blue])], ["OPP", definition("OPP", [CardColor.Black])]]);
    const modifications: unknown[][] = [];
    const game: GameAccess = { state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState, player: (seat: Seat) => players[seat] as never, opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat, permanentById: (id: string) => [self, own, opp].find((p) => p.permanentId === id), definitionOf: (c: CardInstance) => defs.get(c.cardId)! } as unknown as GameAccess;
    const fx = { modifyDP: (...args: unknown[]) => modifications.push(args) } as unknown as Primitives;
    const ask: DecisionApi = { optional: async () => true, chooseOption: async () => 0, chooseTargets: async (_ctx, options) => [options.candidates[0]!], selectCards: async () => [], selectPermanents: async () => [] };
    const source: CardSource = { instanceId: selfCard.instanceId, cardId: "EX4-068", ownerSeat: 0 as Seat, definition: defs.get("EX4-068")!, permanent: () => self, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true };
    const effect = getEffectModule("EX4-068")!.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);
    expect(modifications).toHaveLength(3);
    expect(modifications.every((call) => call[0] === "opp" && call[1] === -6000)).toBe(true);
  });
});
