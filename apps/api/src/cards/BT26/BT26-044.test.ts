import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-044.js";
import "../index.js";

describe("BT26-044 Lilamon", () => {
  it("can apply the unsuspend lock even when suspending is declined (Q7035)", async () => {
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      isSuspended: false,
      topCard: { cardId: "OPP" },
    };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "lilamon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const restrict = vi.fn<(...args: any[]) => any>();
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: () => ({ battleArea: [opponent] }),
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      },
      ask: {
        optional: vi.fn<(...args: any[]) => any>(async () => false),
        chooseTargets: vi.fn<(...args: any[]) => any>(async () => [opponent.permanentId]),
      },
      fx: { restrict },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    expect(effect.optional).toBe(false);
    await effect.resolve(ctx);

    expect(restrict).toHaveBeenCalledWith(opponent.permanentId, "unsuspend", expect.anything());
  });
});
