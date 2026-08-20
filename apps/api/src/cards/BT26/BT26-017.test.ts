import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-017.js";

// A3 for BT26-017 (Zanbamon, BT26): "[On Play] [When Digivolving] 1 of your Digimon
// with the [Shambala] trait gains <Security A. +1> and <Progress> for the turn."
//
// FAILS-WHEN-REVERTED: dropping the `hasShambalaTrait` filter (or either grantKeyword
// call) either grants to a non-Shambala Digimon or omits one of the two keywords; this
// test asserts both grants land on exactly the Shambala permanent.

const CARD_ID = "BT26-017";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "zanbamon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-017 [On Play]/[When Digivolving]: grant Security A. +1 and Progress to a Shambala Digimon", () => {
  it("only the Shambala-trait Digimon is a legal target, and it gets both keywords", async () => {
    const shambala = { permanentId: "own-shambala", topCard: { cardId: "SHAM-001" }, inBreeding: false };
    const nonShambala = { permanentId: "own-other", topCard: { cardId: "OTHER-001" }, inBreeding: false };

    const players = [{ seat: 0 as Seat, battleArea: [shambala, nonShambala] }];

    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, types: card.cardId === "SHAM-001" ? ["Shambala"] : [] }),
    } as unknown as GameAccess;

    const grants: Array<[string, string, number | undefined]> = [];
    const fx = {
      grantKeyword: vi.fn<(...args: any[]) => any>((permanentId: string, keyword: string, _d: unknown, amount?: number) => {
        grants.push([permanentId, keyword, amount]);
      }),
    } as unknown as Primitives;

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const grantEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-grant-shambala`);
    expect(grantEffect).toBeDefined();

    await grantEffect!.resolve(ctx);

    expect(grants).toEqual([
      ["own-shambala", "SecurityAttack", 1],
      ["own-shambala", "Progress", undefined],
    ]);
  });
});
