import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT24-007.js";

const CARD_ID = "BT24-007";

function definition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "BT24",
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Purple"] as never,
    types: [] as never,
    level: 4,
    playCost: 6,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(): CardSource {
  const permanent = {
    permanentId: "tsunomon",
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "egg-instance", cardId: CARD_ID, ownerSeat: 0, faceUp: true },
    stack: [],
    linked: [],
    inBreeding: false,
    isSuspended: false,
  } as unknown as Permanent;
  return {
    cardId: CARD_ID,
    instanceId: "egg-instance",
    ownerSeat: 0 as Seat,
    definition: definition(CARD_ID, { level: 2, playCost: 0 }),
    permanent: () => permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT24-007 Tsunomon", () => {
  it("subscribes the inherited hand-trash trigger and plays one eligible card at -2 cost", async () => {
    const subscribeSubTrigger = vi.fn();
    const playInstances = vi.fn(async () => []);
    const card = { instanceId: "demon-instance", cardId: "BT24-017", ownerSeat: 0 };
    const players = [
      { seat: 0, battleArea: [], hand: [], trash: [card], security: [], deck: [] },
      { seat: 1, battleArea: [], hand: [], trash: [], security: [], deck: [] },
    ];
    const game: GameAccess = {
      state: { memory: 0, turnSeat: 0, players } as never,
      player: (seat) => players[seat] as never,
      opponentOf: (seat) => (seat === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: (instance) =>
        definition(instance.cardId, instance.cardId === "BT24-017" ? { types: ["Demon"] as never } : {}),
    };
    const ctx = {
      source: source(),
      trigger: {},
      game,
      fx: { subscribeSubTrigger, playInstances } as unknown as Primitives,
      ask: {
        selectCards: async (_ctx: EffectContext, options: { candidates: string[] }) => options.candidates.slice(0, 1),
      } as unknown as DecisionApi,
    } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, source())[0]!;
    await effect.resolve(ctx);

    expect(subscribeSubTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ event: "whenHandTrashed", oncePerTurnKey: `${CARD_ID}/trash-hand-play-demon-titan` }),
    );
    const install = subscribeSubTrigger.mock.calls[0]![0];
    await install.run({ ...ctx, source: source(), trigger: { handTrashedSeat: 0 } });

    expect(playInstances).toHaveBeenCalledWith(["demon-instance"], { payCost: true, costDelta: 2 });
  });
});
