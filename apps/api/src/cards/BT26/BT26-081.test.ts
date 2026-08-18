import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-081.js";

// A3 for BT26-081 (Mervamon, BT26): "[All Turns] All of your [Iliad] trait Digimon gain
// <Alliance>, <Reboot>, <Blocker> and +2000 DP."
//
// FAILS-WHEN-REVERTED: dropping the `hasIliadTrait` filter (or any of the 3 keyword
// grants / the DP grant) either grants to a non-Iliad Digimon or misses one of the 4
// buffs; this test asserts all 4 land, and ONLY on the Iliad-trait permanent.

const CARD_ID = "BT26-081";

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
    instanceId: "mervamon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-081 [All Turns]: group-grant Alliance/Reboot/Blocker/+2000 DP to Iliad Digimon", () => {
  it("grants all four buffs to the Iliad permanent, and nothing to the non-Iliad one", async () => {
    const iliad = { permanentId: "own-iliad", topCard: { cardId: "ILIAD-1" }, inBreeding: false };
    const other = { permanentId: "own-other", topCard: { cardId: "OTHER-1" }, inBreeding: false };
    const players = [{ seat: 0 as Seat, battleArea: [iliad, other] }];

    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, types: card.cardId === "ILIAD-1" ? ["Iliad"] : [] }),
    } as unknown as GameAccess;

    const grants: Array<[string, string]> = [];
    const dpChanges: Array<[string, number]> = [];
    const fx = {
      grantKeyword: vi.fn((permanentId: string, keyword: string) => grants.push([permanentId, keyword])),
      modifyDP: vi.fn((permanentId: string, delta: number) => dpChanges.push([permanentId, delta])),
    } as unknown as Primitives;

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const groupGrant = effects.find((e) => e.effectKey === `${CARD_ID}/all-turns-iliad-group-grant`);
    expect(groupGrant).toBeDefined();

    await groupGrant!.resolve(ctx);

    expect(grants).toEqual([
      ["own-iliad", "Alliance"],
      ["own-iliad", "Reboot"],
      ["own-iliad", "Blocker"],
    ]);
    expect(dpChanges).toEqual([["own-iliad", 2000]]);
  });
});
