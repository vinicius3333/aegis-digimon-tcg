import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectContext, Primitives } from "../../engine/effects/EffectContext.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import module from "./BT26-004.js";
import "../index.js";

describe("BT26-004 Pagumon", () => {
  it("places a hand card face down under a Glowing Dawn Tamer before drawing", async () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "pagumon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { cardId: "BT26-010" },
    };
    const placed = vi.fn(async () => []);
    const draw = vi.fn(async () => undefined);
    const ctx = {
      source,
      trigger: { attackerPermanentId: "pagumon" },
      game: {
        player: () => ({ hand: [{ instanceId: "hand-card" }], battleArea: [tamer] }),
        permanentById: (id: string) => (id === "tamer" ? tamer : undefined),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "BT26-010" ? { kinds: [CardKind.Tamer], types: ["Glowing Dawn"] } : {},
      },
      ask: {
        selectCards: vi.fn(async () => ["hand-card"]),
      },
      fx: { placeUnder: placed, draw },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    await effect.resolve(ctx);

    expect(placed).toHaveBeenCalledWith("tamer", ["hand-card"], { faceUp: false });
    expect(draw).toHaveBeenCalledWith(0, 1);
  });
});
