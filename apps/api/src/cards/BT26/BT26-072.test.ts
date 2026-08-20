import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-072";

function definition(cardId: string, overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    colors: ["Purple"] as never,
    kinds: [CardKind.Digimon],
    playCost: 4,
    dp: 4000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...overrides,
  };
}

function source(): CardSource {
  return {
    instanceId: "peckmon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition(CARD_ID),
    permanent: () => ({ permanentId: "peckmon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-072 Peckmon", () => {
  it("digivolves from a level 3 DATA SQUAD Digimon for cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "peckmon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("peckmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("peckmon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("places the paid hand card face down at the bottom under Keenan, then deletes a level-4 target", async () => {
    const cardSource = source();
    const handCard = { instanceId: "cost", cardId: "COST" };
    const keenan = {
      permanentId: "keenan",
      topCard: { cardId: "KEENAN" },
      stack: [{ instanceId: "existing-bottom", cardId: "OLD", faceUp: false }],
      inBreeding: false,
    };
    const target = { permanentId: "target", topCard: { cardId: "TARGET" } };
    const players = [
      { hand: [handCard], battleArea: [keenan] },
      { hand: [], battleArea: [target] },
    ];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        definition(card.cardId, {
          nameEn: card.cardId === "KEENAN" ? "Keenan Crier" : card.cardId,
          kinds: card.cardId === "KEENAN" ? [CardKind.Tamer] : [CardKind.Digimon],
          level: card.cardId === "TARGET" ? 4 : 3,
        }),
      permanentById: () => keenan,
    } as unknown as GameAccess;
    const placeUnder = vi.fn(async () => [{ ...handCard, faceUp: false }]);
    const deletePermanent = vi.fn(async () => 1);
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      fx: { placeUnder, deletePermanent } as unknown as Primitives,
      ask: {
        selectCards: vi.fn(async () => [handCard.instanceId]),
        chooseOption: vi.fn(async () => 1),
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!;

    expect(effect).toMatchObject({ optional: true });
    await effect.resolve(ctx);

    expect(placeUnder).toHaveBeenCalledWith("keenan", [handCard.instanceId], { faceUp: false });
    expect(deletePermanent).toHaveBeenCalledWith(["target"], "byEffect");
  });

  it("does not delete when moving the hand card fails, and excludes level-less Digimon", async () => {
    const cardSource = source();
    const handCard = { instanceId: "cost", cardId: "COST" };
    const keenan = { permanentId: "keenan", topCard: { cardId: "KEENAN" }, stack: [], inBreeding: false };
    const targets = [
      { permanentId: "level-less", topCard: { cardId: "LEVELLESS" } },
      { permanentId: "level-four", topCard: { cardId: "LEVEL4" } },
    ];
    const players = [
      { hand: [handCard], battleArea: [keenan] },
      { hand: [], battleArea: targets },
    ];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        definition(card.cardId, {
          nameEn: card.cardId === "KEENAN" ? "Keenan Crier" : card.cardId,
          kinds: card.cardId === "KEENAN" ? [CardKind.Tamer] : [CardKind.Digimon],
          ...(card.cardId === "LEVEL4" ? { level: 4 } : {}),
        }),
      permanentById: () => keenan,
    } as unknown as GameAccess;
    const deletePermanent = vi.fn();
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      fx: { placeUnder: vi.fn(async () => []), deletePermanent } as unknown as Primitives,
      ask: {
        selectCards: vi.fn(async () => [handCard.instanceId]),
        chooseOption: vi.fn(async () => 1),
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
    expect(deletePermanent).not.toHaveBeenCalled();
  });

  it("routes the inherited hand-trash choice to the opponent", async () => {
    const cardSource = source();
    const opponentCard = { instanceId: "opponent-card", cardId: "HAND" };
    const opponentSelect = vi.fn(async () => [opponentCard.instanceId]);
    const trash = vi.fn(async () => [opponentCard]);
    const ctx = {
      source: cardSource,
      trigger: {},
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({ hand: [opponentCard] }),
      } as unknown as GameAccess,
      ask: { opponent: { selectCards: opponentSelect } },
      fx: { trash } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, cardSource)[0]!;

    await effect.resolve(ctx);
    expect(opponentSelect).toHaveBeenCalledWith(ctx, {
      candidates: [opponentCard.instanceId],
      min: 1,
      max: 1,
    });
    expect(trash).toHaveBeenCalledWith([opponentCard.instanceId]);
  });
});
