import { describe, expect, it, vi } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-023.js";
import "../index.js";

describe("BT26-023 Mojyamon", () => {
  it("places the hand card face down before bottom-decking an opponent's level-4 Digimon", async () => {
    const self = { permanentId: "mojyamon", inBreeding: false, topCard: { cardId: "BT26-023" } };
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      topCard: { instanceId: "opponent-card", cardId: "BT26-020" },
    };
    const source = {
      ownerSeat: 0,
      permanent: () => self,
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const placeUnder = vi.fn<(...args: any[]) => any>(async () => []);
    const returnToDeck = vi.fn<(...args: any[]) => any>(async () => []);
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) => (seat === 0 ? { hand: [{ instanceId: "hand-card" }] } : { battleArea: [opponent] }),
        definitionOf: (card: { cardId: string }) => ({
          cardId: card.cardId,
          kinds: ["Digimon"],
          level: card.cardId === "BT26-020" ? 4 : 4,
        }),
        permanentById: (id: string) => (id === "opponent" ? opponent : undefined),
      },
      ask: { selectCards: vi.fn<(...args: any[]) => any>(async () => ["hand-card"]) },
      fx: { placeUnder, returnToDeck },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    await effect.resolve(ctx);

    expect(placeUnder).toHaveBeenCalledWith("mojyamon", ["hand-card"], { faceUp: false });
    expect(returnToDeck).toHaveBeenCalledWith(["opponent-card"], { toTop: false });
  });
});
