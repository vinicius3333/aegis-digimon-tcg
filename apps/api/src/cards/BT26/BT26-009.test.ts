import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-009.js";
import "../index.js";

const definition = (overrides: Partial<CardDefinition>): CardDefinition =>
  ({
    cardId: "TEST-001",
    set: "TEST",
    nameEn: "Test",
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...overrides,
  }) as CardDefinition;

describe("BT26-009 Hyokomon", () => {
  it("recognizes Chronomon in inherited text for its start-of-main cost (Q6963)", async () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "hyokomon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    const inheritedMatch = { instanceId: "inherited-match", cardId: "TEST-002" };
    const unrelated = { instanceId: "unrelated", cardId: "TEST-003" };
    const selectCards = vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]);
    const trash = vi.fn<(...args: any[]) => any>(async () => undefined);
    const draw = vi.fn<(...args: any[]) => any>(async () => undefined);
    const gainMemory = vi.fn<(...args: any[]) => any>();
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [inheritedMatch, unrelated] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === inheritedMatch.cardId
            ? definition({ cardId: card.cardId, inheritedEffectText: "[When Attacking] If [Chronomon]..." })
            : definition({ cardId: card.cardId }),
      },
      ask: { selectCards },
      fx: { trash, draw, gainMemory },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;
    await effect.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(ctx, {
      candidates: [inheritedMatch.instanceId],
      min: 0,
      max: 1,
    });
    expect(trash).toHaveBeenCalledWith([inheritedMatch.instanceId]);
    expect(draw).toHaveBeenCalledWith(0, 1);
    expect(gainMemory).toHaveBeenCalledWith(1);
  });
});
