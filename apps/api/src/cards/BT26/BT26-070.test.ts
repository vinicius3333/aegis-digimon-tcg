import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-070.js";

const CARD_ID = "BT26-070";

function def(cardId: string, kinds: string[], types: string[] = []): CardDefinition {
  return {
    cardId,
    set: "BT26",
    nameEn: cardId,
    kinds: kinds as never,
    colors: ["Purple"] as never,
    playCost: 3,
    dp: 3000,
    types,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function source(): CardSource {
  return {
    instanceId: "nightchirop-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: def(CARD_ID, ["Digimon"]),
    permanent: () => ({ permanentId: "nightchirop-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-070 bottom face-down Tamer cost", () => {
  it("offers only the bottom-most face-down card from each Tamer", async () => {
    const tamerOne = {
      permanentId: "tamer-one",
      inBreeding: false,
      topCard: { instanceId: "tamer-one-top", cardId: "TAMER-1" },
      stack: [
        { instanceId: "one-bottom", cardId: "UNDER-1", faceUp: false },
        { instanceId: "one-top", cardId: "UNDER-2", faceUp: false },
      ],
    };
    const tamerTwo = {
      permanentId: "tamer-two",
      inBreeding: false,
      topCard: { instanceId: "tamer-two-top", cardId: "TAMER-2" },
      stack: [{ instanceId: "two-bottom", cardId: "UNDER-3", faceUp: false }],
    };
    const option = { instanceId: "option", cardId: "OPTION" } as CardInstance;
    const players = [{ seat: 0 as Seat, battleArea: [tamerOne, tamerTwo], trash: [option], hand: [] }];
    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) => {
        if (card.cardId.startsWith("TAMER")) return def(card.cardId, ["Tamer"], ["Glowing Dawn"]);
        if (card.cardId === "OPTION") return def(card.cardId, ["Option"], ["Glowing Dawn"]);
        return def(card.cardId, ["Digimon"]);
      },
    } as unknown as GameAccess;
    const firstSelection: string[][] = [];
    const fx = {
      trashDigivolutionCards: vi.fn(async (_host: string, ids: string[]) => {
        firstSelection.push(ids);
        return ids.map((instanceId) => ({ instanceId, cardId: "UNDER" }));
      }),
      gainMemory: vi.fn(),
      useOptionFromHand: vi.fn(async () => undefined),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn(async () => true),
      selectCards: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) => opts.candidates.slice(0, 2)),
    } as unknown as EffectContext["ask"];
    const cardSource = source();
    const ctx = { source: cardSource, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDeclaration, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(firstSelection).toEqual([["one-bottom"], ["two-bottom"]]);
  });
});
