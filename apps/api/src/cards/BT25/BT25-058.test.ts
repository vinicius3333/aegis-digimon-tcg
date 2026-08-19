import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-058.js";

function def(cardId: string, kinds: string[], over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "BT25",
    nameEn: cardId,
    kinds: kinds as never,
    colors: ["Green"] as never,
    types: ["TS"] as never,
    level: 6,
    playCost: 6,
    dp: 7000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function permanent(id: string, seat: Seat, cardId: string, stack: unknown[] = []): Permanent {
  return {
    permanentId: id,
    controllerSeat: seat,
    topCard: { instanceId: `${id}-top`, cardId, ownerSeat: seat, faceUp: true },
    stack,
    linked: [],
    inBreeding: false,
    isSuspended: false,
    baseDP: 7000,
    currentDP: 7000,
  } as unknown as Permanent;
}

describe("BT25-058 Callismon", () => {
  it("de-digivolves an opponent Digimon and offers the follow-up battle when an effect plays a Digimon", async () => {
    const self = permanent("callismon", 0, "BT25-058");
    const opponent = permanent("opponent", 1, "BT24-017", [
      { instanceId: "source-under", cardId: "BT24-007", ownerSeat: 1, faceUp: true },
    ]);
    const players = [
      { seat: 0, battleArea: [self], hand: [], trash: [], security: [], deck: [] },
      { seat: 1, battleArea: [opponent], hand: [], trash: [], security: [], deck: [] },
    ];
    const deDigivolve = vi.fn();
    const forceBattle = vi.fn(async () => undefined);
    const game: GameAccess = {
      state: { memory: 0, turnSeat: 0, players } as never,
      player: (seat) => players[seat] as never,
      opponentOf: (seat) => (seat === 0 ? 1 : 0),
      permanentById: (id) => [self, opponent].find((candidate) => candidate.permanentId === id),
      definitionOf: (card) =>
        def(card.cardId, card.cardId === "BT24-017" ? ["Digimon"] : ["Digimon"], {
          level: card.cardId === "BT24-017" ? 6 : 4,
        }),
    };
    const ctx = {
      source: {
        cardId: "BT25-058",
        instanceId: "callismon-instance",
        ownerSeat: 0,
        definition: def("BT25-058", ["Digimon"]),
        permanent: () => self,
        isOnBattleArea: () => true,
        isOwnersTurn: () => true,
        hasColor: () => false,
      } as CardSource,
      trigger: { enteredByEffect: true },
      game,
      fx: { deDigivolve, forceBattle } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseTargets: async (_ctx: EffectContext, options: { candidates: string[] }) => options.candidates.slice(0, 1),
      } as unknown as DecisionApi,
    } as unknown as EffectContext;

    const effect = getEffectModule("BT25-058")!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, ctx.source)[0]!;
    await effect.resolve(ctx);

    expect(deDigivolve).toHaveBeenCalledWith("opponent", 1, { byEffectSeat: 0 });
    expect(forceBattle).toHaveBeenCalledWith("callismon", "opponent");
  });
});
