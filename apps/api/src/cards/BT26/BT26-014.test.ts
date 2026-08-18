import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-014.js";

// A3 for BT26-014 (Darumamon, BT26): "[On Play] [When Digivolving] Delete 1 of your
// opponent's Digimon with 7000 DP or less."
//
// FAILS-WHEN-REVERTED: dropping the `p.currentDP <= 7000` filter (or the delete call
// itself) leaves `deletePermanent` uncalled or called against an over-threshold target;
// this test asserts the exact deleted permanent id.

const CARD_ID = "BT26-014";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "darumamon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-014 [On Play]/[When Digivolving]: delete 1 opponent Digimon with 7000 DP or less", () => {
  it("deletes only the low-DP opponent target, not the high-DP one", async () => {
    const oppLow = { permanentId: "opp-low", currentDP: 7000, topCard: { cardId: "AD1-001" } };
    const oppHigh = { permanentId: "opp-high", currentDP: 8000, topCard: { cardId: "AD1-001" } };

    const players = [
      { seat: 0 as Seat, battleArea: [] },
      { seat: 1 as Seat, battleArea: [oppLow, oppHigh] },
    ];

    const deleted: string[][] = [];
    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;

    const fx = {
      deletePermanent: vi.fn(async (ids: string[]) => {
        deleted.push(ids);
        return ids.length;
      }),
    } as unknown as Primitives;

    const ask = {
      chooseTargets: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]),
    } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const deleteEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-delete-low-dp`);
    expect(deleteEffect).toBeDefined();

    await deleteEffect!.resolve(ctx);

    expect(deleted).toEqual([["opp-low"]]);
  });
});
