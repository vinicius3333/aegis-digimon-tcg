import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-032.js";
import "../index.js";

describe("BT26-032 Ceresmon", () => {
  it("allows either player's Digimon to pay the suspend cost and pays reduced Option use cost (Q7001)", async () => {
    const own = { permanentId: "own", inBreeding: false, isSuspended: false, topCard: { cardId: "OWN" } };
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      isSuspended: false,
      topCard: { cardId: "OPP" },
    };
    const option = { instanceId: "option", cardId: "OPTION" };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "ceresmon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    const suspend = vi.fn<(...args: any[]) => any>(async () => undefined);
    const gainMemory = vi.fn<(...args: any[]) => any>();
    const useOptionFromHand = vi.fn<(...args: any[]) => any>(async () => []);
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) => (seat === 0 ? { hand: [option], battleArea: [own] } : { battleArea: [opponent] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "OPTION"
            ? { kinds: [CardKind.Option], types: ["TS"], playCost: 7 }
            : { kinds: [CardKind.Digimon] },
      },
      ask: {
        chooseTargets: vi.fn<(...args: any[]) => any>(async () => [opponent.permanentId]),
        selectCards: vi.fn<(...args: any[]) => any>(async () => [option.instanceId]),
      },
      fx: { suspend, gainMemory, useOptionFromHand },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);

    expect(suspend).toHaveBeenCalledWith([opponent.permanentId]);
    expect(gainMemory).toHaveBeenCalledWith(-2);
    expect(useOptionFromHand).toHaveBeenCalledWith(ctx, option.instanceId, 7);
  });
});
