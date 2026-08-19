import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-082.js";

const CARD_ID = "BT26-082";

function fakeDef(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "BT26",
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Purple"] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "ravemon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(CARD_ID),
    permanent: () => ({ permanentId: "ravemon-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-082 alternate cost", () => {
  it("offers only the bottom-most face-down card from each Tamer", async () => {
    const source = makeSource();
    const tamer1 = {
      permanentId: "tamer-1",
      inBreeding: false,
      topCard: { cardId: "tamer" },
      stack: [
        { instanceId: "tamer-1-bottom", faceUp: false },
        { instanceId: "tamer-1-upper", faceUp: false },
      ],
    };
    const tamer2 = {
      permanentId: "tamer-2",
      inBreeding: false,
      topCard: { cardId: "tamer" },
      stack: [{ instanceId: "tamer-2-bottom", faceUp: false }],
    };
    const opponentDigimon = {
      permanentId: "opponent-digimon",
      topCard: { cardId: "opponent" },
      currentDP: 12000,
    };
    const players = [
      { seat: 0 as Seat, battleArea: [tamer1, tamer2] },
      { seat: 1 as Seat, battleArea: [opponentDigimon] },
    ];
    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "tamer"
          ? fakeDef("tamer", { kinds: [CardKind.Tamer] as never })
          : fakeDef(card.cardId, { dp: 12000 }),
    } as unknown as GameAccess;
    const selected: string[][] = [];
    const trashed: string[][] = [];
    const fx = {
      trashDigivolutionCards: vi.fn(async (_host: string, ids: string[]) => {
        trashed.push(ids);
        return ids;
      }),
      deletePermanent: vi.fn(async () => 0),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn(async () => true),
      chooseOption: vi.fn(async () => 1),
      selectCards: vi.fn(async (_ctx: unknown, options: { candidates: string[] }) => {
        selected.push(options.candidates);
        return options.candidates;
      }),
    } as unknown as EffectContext["ask"];
    const ctx = { source, game, fx, ask, trigger: {} } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);

    expect(selected).toEqual([["tamer-1-bottom", "tamer-2-bottom"]]);
    expect(trashed).toEqual([["tamer-1-bottom"], ["tamer-2-bottom"]]);
  });
});
