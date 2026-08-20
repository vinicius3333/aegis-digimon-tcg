import {
  CardColor,
  CardKind,
  EffectTiming,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-064";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "TEST",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? [CardColor.Purple],
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 0,
    dp: overrides.dp ?? 0,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function instance(instanceId: string, cardId: string): CardInstance {
  return { instanceId, cardId, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

function source(): CardSource {
  return {
    instanceId: "demidevimon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, types: ["Evil", "Iliad", "ADAMAS", "TS"] }),
    permanent: () => ({ permanentId: "demidevimon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-064 DemiDevimon", () => {
  it("uses the exact Lv.2 [TS] cost-0 evolution path from a non-purple Digi-Egg", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "yokomon" },
        hand: [{ card: CARD_ID, as: "demidevimon" }],
        deck: ["BT1-009"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yokomon").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yokomon").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("yokomon").stack.map(({ cardId }) => cardId)).toEqual(["BT26-001"]);
  });

  it("rejects the trait path from a non-purple Lv.2 card without [TS]", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "plainYokomon" },
        hand: [{ card: CARD_ID, as: "demidevimon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainYokomon").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly reveals three, recognizes a loose Rule-granted [Wizard], fills distinct slots, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "demidevimon" }],
          deck: [
            { card: "BT26-073", as: "ruleWizardAndTs" },
            { card: "BT26-066", as: "tsOnly" },
            { card: "BT1-009", as: "nonMatch" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-073") &&
        s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-066"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT26-066", "BT26-073"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
  });

  it("does not use one dual-matching card for both mandatory add slots", async () => {
    const dual = instance("dual", "DUAL");
    const other = instance("other", "OTHER");
    const game = {
      player: () => ({ deck: [dual, other] }),
      definitionOf: (card: CardInstance) =>
        definition({ cardId: card.cardId, types: card.cardId === "DUAL" ? ["Wizard", "TS"] : [] }),
    } as unknown as GameAccess;
    const returnToHand = vi.fn(async (ids: string[]) => [dual].filter(({ instanceId }) => ids.includes(instanceId)));
    const returnToDeck = vi.fn(async () => []);
    const orderCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) =>
      [...request.candidates].reverse(),
    );
    const selectCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) => [
      request.candidates[0]!,
    ]);
    const cardSource = source();
    const ctx = {
      source: cardSource,
      game,
      ask: { selectCards, orderCards },
      fx: { reveal: vi.fn(async () => [dual, other]), returnToHand, returnToDeck } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!;

    await effect.resolve(ctx);

    expect(selectCards).toHaveBeenCalledOnce();
    expect(returnToHand).toHaveBeenCalledWith([dual.instanceId]);
    expect(returnToDeck).toHaveBeenCalledWith([other.instanceId], { toTop: false });
    expect(orderCards).not.toHaveBeenCalled();
  });

  it("orders every card that failed to reach hand at the deck bottom", async () => {
    const evil = instance("evil", "EVIL");
    const ts = instance("ts", "TS");
    const other = instance("other", "OTHER");
    const cards = [evil, ts, other];
    const game = {
      player: () => ({ deck: cards }),
      definitionOf: (card: CardInstance) =>
        definition({
          cardId: card.cardId,
          types: card.cardId === "EVIL" ? ["Undead"] : card.cardId === "TS" ? ["TS"] : [],
        }),
    } as unknown as GameAccess;
    const orderCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) =>
      [...request.candidates].reverse(),
    );
    const returnToDeck = vi.fn(async () => []);
    const cardSource = source();
    const ctx = {
      source: cardSource,
      game,
      ask: {
        selectCards: vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) => [request.candidates[0]!]),
        orderCards,
      },
      fx: {
        reveal: vi.fn(async () => cards),
        returnToHand: vi.fn(async () => [evil]),
        returnToDeck,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!;

    await effect.resolve(ctx);

    expect(orderCards).toHaveBeenCalledWith(ctx, {
      candidates: [ts.instanceId, other.instanceId],
      visibleCards: [
        { instanceId: ts.instanceId, cardId: ts.cardId },
        { instanceId: other.instanceId, cardId: other.cardId },
      ],
      destination: "deckBottom",
    });
    expect(returnToDeck).toHaveBeenCalledWith([other.instanceId, ts.instanceId], { toTop: false });
  });

  it("the inherited effect draws then trashes exactly once from a realistic evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-072",
              as: "peckmon",
              dp: 9000,
              under: [{ card: CARD_ID, as: "inheritedDemiDevimon" }],
            },
          ],
          hand: [{ card: "BT1-009", as: "startingHand" }],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-009", as: "secondDraw" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    // Drive the permanent-scoped production timing directly so two windows remain in
    // the same turn; a full combat may legitimately cross a turn boundary after battle.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("peckmon"));
    await settle(() => s.state.players[0]!.deck.length === 1 && s.state.players[0]!.trash.length === 1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("peckmon"));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
