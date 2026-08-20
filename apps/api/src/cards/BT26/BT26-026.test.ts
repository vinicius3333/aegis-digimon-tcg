import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-026.js";
import "../index.js";

describe("BT26-026 Cougarmon", () => {
  it("requires the actual bottom Tamer card to be face-down and chooses the Option before paying", async () => {
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { cardId: "TAMER" },
      stack: [
        { instanceId: "bottom", faceUp: false },
        { instanceId: "upper", faceUp: false },
      ],
    };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "cougarmon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const calls: string[] = [];
    const chosenOption = { instanceId: "option", cardId: "OPTION" };
    const ctx = {
      source,
      trigger: { attackerPermanentId: "cougarmon" },
      game: {
        player: () => ({ hand: [chosenOption], battleArea: [tamer], security: [] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? { kinds: [CardKind.Tamer] }
            : { kinds: [CardKind.Option], types: ["Glowing Dawn"], playCost: 3 },
      },
      ask: {
        selectCards: vi.fn<(...args: any[]) => any>(async () => {
          calls.push("selectOption");
          return [chosenOption.instanceId];
        }),
        optional: vi.fn<(...args: any[]) => any>(async () => {
          calls.push("payCost");
          return true;
        }),
      },
      fx: {
        trashDigivolutionCards: vi.fn<(...args: any[]) => any>(async () => [{ instanceId: "bottom" }]),
        gainMemory: vi.fn<(...args: any[]) => any>(),
        useOptionFromHand: vi.fn<(...args: any[]) => any>(async () => []),
      },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(calls).toEqual(["selectOption", "payCost"]);
    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["bottom"]);
    expect(ctx.fx.useOptionFromHand).toHaveBeenCalledWith(ctx, "option", 3);

    tamer.stack[0]!.faceUp = true;
    expect(effect.canActivate(ctx)).toBe(false);
  });
});
