import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-073.js";

// A3 for BT26-073 (Aegiochusmon: Dark, BT26): "[On Play] [When Digivolving] By deleting
// this Digimon or returning 1 [Shaman] or [TS] trait card from your trash to the bottom
// of the deck, delete 1 of your opponent's level 5 or lower Digimon."
//
// FAILS-WHEN-REVERTED: dropping the `(def.level ?? 99) <= 5` filter on the delete target
// (or skipping the cost) either deletes an over-level Digimon or deletes for free; this
// test asserts the paid cost (self-delete) and the exact delete target.

const CARD_ID = "BT26-073";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    level: over.level,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "aegiochusmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-073 [On Play]/[When Digivolving]: cost then delete a level<=5 opponent Digimon", () => {
  it("pays by self-deletion (no trash card available) then deletes only the low-level target", async () => {
    const oppLow = { permanentId: "opp-low", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const oppHigh = { permanentId: "opp-high", topCard: { cardId: "AD1-002" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, battleArea: [], trash: [] },
      { seat: 1 as Seat, battleArea: [oppLow, oppHigh] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, level: card.cardId === "AD1-001" ? 4 : 6 }),
    } as unknown as GameAccess;

    const deleted: string[][] = [];
    const fx = {
      deletePermanent: vi.fn(async (ids: string[]) => {
        deleted.push(ids);
        return ids.length;
      }),
    } as unknown as Primitives;

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const costDeleteEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-cost-delete`);
    expect(costDeleteEffect).toBeDefined();

    await costDeleteEffect!.resolve(ctx);

    // First call pays the cost (self-delete), second call deletes the eligible opponent target.
    expect(deleted).toEqual([["self-perm"], ["opp-low"]]);
  });
});
