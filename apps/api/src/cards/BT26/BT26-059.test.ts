import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-059.js";
import "../index.js";

describe("BT26-059 Plutomon", () => {
  it("can trash the hand cost during the opponent's turn without playing the Titan (Q7076)", async () => {
    const handCard = { instanceId: "hand-card", cardId: "HAND" };
    const trashTitan = { instanceId: "trash-titan", cardId: "TITAN" };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "plutomon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => false,
    } as unknown as CardSource;
    const trash = vi.fn(async () => []);
    const playInstances = vi.fn(async () => []);
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [handCard], trash: [trashTitan] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TITAN"
            ? { kinds: [CardKind.Digimon], types: ["Titan"], level: 4 }
            : { kinds: [CardKind.Option] },
      },
      ask: { selectCards: vi.fn(async (input: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]) },
      fx: { trash, playInstances },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(trash).toHaveBeenCalledWith([handCard.instanceId]);
    expect(playInstances).not.toHaveBeenCalled();
  });
});
