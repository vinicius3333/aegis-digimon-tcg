import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-064.js";

const CARD_ID = "BT26-064";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT26",
    nameEn: over.nameEn ?? "DemiDevimon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Purple"] as never),
    playCost: over.playCost ?? 3,
    dp: over.dp ?? 2000,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "demidevimon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-064 [On Play] reveal and add", () => {
  it("requires both matching cards when candidates are available", async () => {
    const revealed = [
      { instanceId: "evil", cardId: "EVIL" },
      { instanceId: "ts", cardId: "TS" },
      { instanceId: "other", cardId: "OTHER" },
    ] as CardInstance[];
    const selectedMins: number[] = [];
    const returnedToHand: string[][] = [];
    const returnedToDeck: string[][] = [];
    const players = [{ seat: 0 as Seat, deck: revealed, hand: [] }];
    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({
          cardId: card.cardId,
          types: card.cardId === "EVIL" ? ["Wizard"] : card.cardId === "TS" ? ["TS"] : [],
        }),
    } as unknown as GameAccess;
    const fx = {
      reveal: vi.fn(async () => revealed),
      returnToHand: vi.fn(async (ids: string[]) => returnedToHand.push(ids)),
      returnToDeck: vi.fn(async (ids: string[]) => returnedToDeck.push(ids)),
    } as unknown as Primitives;
    const ask = {
      selectCards: vi.fn(async (_ctx: unknown, opts: { candidates: string[]; min: number }) => {
        selectedMins.push(opts.min);
        return [opts.candidates[0]!];
      }),
    } as unknown as EffectContext["ask"];
    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    await effect.resolve(ctx);

    expect(selectedMins).toEqual([1, 1]);
    expect(returnedToHand).toEqual([["evil"], ["ts"]]);
    expect(returnedToDeck).toEqual([["other"]]);
  });
});
