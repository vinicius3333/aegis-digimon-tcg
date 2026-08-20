import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-056.js";
import "../index.js";

describe("BT26-056 Inferno Divide", () => {
  it("can de-digivolve without a hand card (Q7059)", async () => {
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      topCard: { cardId: "OPP" },
    };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "cerberus" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const deDigivolve = vi.fn<(...args: any[]) => any>();
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) => (seat === 0 ? { hand: [] } : { battleArea: [opponent] }),
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      },
      ask: { chooseTargets: vi.fn<(...args: any[]) => any>(async () => [opponent.permanentId]) },
      fx: { deDigivolve, trash: vi.fn<(...args: any[]) => any>() },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(deDigivolve).toHaveBeenCalledWith(opponent.permanentId, 3, { byEffectSeat: 0 });
  });
});
