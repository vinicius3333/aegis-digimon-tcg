import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-101.js";

const CARD_ID = "BT25-101";

function definition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "BT25",
    nameEn: cardId,
    kinds: ["Option"] as never,
    colors: ["Green"] as never,
    types: ["TS"] as never,
    playCost: 2,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

describe("BT25-101 Final Crest", () => {
  it("pays the TS hand cost, draws two, and links a TS card from trash", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "host-top", cardId: "BT25-020", ownerSeat: 0, faceUp: true },
      stack: [],
      linked: [],
      inBreeding: false,
      isSuspended: false,
    } as unknown as Permanent;
    const tsHand = { instanceId: "ts-hand", cardId: "BT25-020", ownerSeat: 0 };
    const players: Array<{
      seat: number;
      battleArea: Permanent[];
      hand: (typeof tsHand)[];
      trash: (typeof tsHand)[];
      security: never[];
      deck: never[];
    }> = [
      { seat: 0, battleArea: [host], hand: [tsHand], trash: [], security: [], deck: [] },
      { seat: 1, battleArea: [], hand: [], trash: [], security: [], deck: [] },
    ];
    const trash = vi.fn(async (ids: string[]) => {
      players[0]!.hand = players[0]!.hand.filter((card) => !ids.includes(card.instanceId));
      players[0]!.trash.push(tsHand);
    });
    const draw = vi.fn(async () => []);
    const link = vi.fn();
    const game: GameAccess = {
      state: { memory: 0, turnSeat: 0, players } as never,
      player: (seat) => players[seat] as never,
      opponentOf: (seat) => (seat === 0 ? 1 : 0),
      permanentById: () => host,
      definitionOf: (card) =>
        definition(card.cardId, card.cardId === "BT25-020" ? { kinds: ["Digimon"] as never } : {}),
    };
    const source: CardSource = {
      cardId: CARD_ID,
      instanceId: "option-instance",
      ownerSeat: 0,
      definition: definition(CARD_ID),
      permanent: () => undefined,
      isOnBattleArea: () => false,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    const ctx = {
      source,
      trigger: {},
      game,
      fx: { trash, draw, link } as unknown as Primitives,
      ask: {
        selectCards: async (_ctx: EffectContext, options: { candidates: string[] }) => options.candidates.slice(0, 1),
        chooseOption: async () => 0,
        optional: async () => true,
      } as unknown as DecisionApi,
    } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    await effect.resolve(ctx);

    expect(trash).toHaveBeenCalledWith(["ts-hand"]);
    expect(draw).toHaveBeenCalledWith(0, 2);
    expect(link).toHaveBeenCalledWith("host", ["option-instance"]);
  });
});
