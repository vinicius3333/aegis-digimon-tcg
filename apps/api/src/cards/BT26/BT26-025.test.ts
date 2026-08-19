import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-025.js";

const CARD_ID = "BT26-025";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT26",
    nameEn: over.nameEn ?? "Liollmon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Yellow"] as never),
    playCost: over.playCost ?? 3,
    dp: over.dp ?? 3000,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "liollmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-025 inherited [When Attacking]", () => {
  it("can recover when the security stack is empty without adding a card to hand", async () => {
    const players = [{ seat: 0 as Seat, security: [], hand: [] }];
    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef(),
    } as unknown as GameAccess;
    const securityToHand = vi.fn();
    const recoverToSecurity = vi.fn();
    const fx = { securityToHand, recoverToSecurity } as unknown as Primitives;
    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    expect(effect.canActivate?.(ctx)).not.toBe(false);
    await effect.resolve(ctx);

    expect(securityToHand).not.toHaveBeenCalled();
    expect(recoverToSecurity).toHaveBeenCalledWith(0, 1);
  });
});
