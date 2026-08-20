import { describe, expect, it, vi } from "vitest";
import { CardColor, CardKind, EffectTiming, Phase, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-036.js";
import "../index.js";

const CARD_ID = "BT26-036";

function definition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: over.colors ?? [CardColor.Green],
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 1000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(permanentId = "lalamon"): CardSource {
  return {
    instanceId: "lalamon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-036 reveal resolution boundaries", () => {
  it("offers every exact trait alternative and green Tamer, moves only the successful pick, and lets controller order the rest", async () => {
    const cards = [
      { instanceId: "vegetation", cardId: "VEGETATION", ownerSeat: 0 as Seat, faceUp: false },
      { instanceId: "fairy", cardId: "FAIRY", ownerSeat: 0 as Seat, faceUp: false },
      { instanceId: "data-squad", cardId: "DATA", ownerSeat: 0 as Seat, faceUp: false },
      { instanceId: "green-tamer", cardId: "GREEN_TAMER", ownerSeat: 0 as Seat, faceUp: false },
      { instanceId: "red-tamer", cardId: "RED_TAMER", ownerSeat: 0 as Seat, faceUp: false },
      { instanceId: "plain", cardId: "PLAIN", ownerSeat: 0 as Seat, faceUp: false },
    ];
    const definitions: Record<string, CardDefinition> = {
      VEGETATION: definition({ types: ["Vegetation"] }),
      FAIRY: definition({ types: ["Fairy"] }),
      DATA: definition({ types: ["DATA SQUAD"] }),
      GREEN_TAMER: definition({ kinds: [CardKind.Tamer] as never, colors: [CardColor.Green] }),
      RED_TAMER: definition({ kinds: [CardKind.Tamer] as never, colors: [CardColor.Red] }),
      PLAIN: definition({ types: ["Machine"] }),
    };
    const selectCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) => [
      request.candidates.at(-1)!,
    ]);
    const orderCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) =>
      [...request.candidates].reverse(),
    );
    const returnToHand = vi.fn(async (ids: string[]) => cards.filter((card) => ids.includes(card.instanceId)));
    const returnToDeck = vi.fn(async () => []);
    const cardSource = source();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ deck: cards }),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: { selectCards, orderCards },
      fx: { reveal: async () => cards, returnToHand, returnToDeck } as unknown as Primitives,
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(ctx, {
      candidates: ["vegetation", "fairy", "data-squad", "green-tamer"],
      min: 1,
      max: 1,
    });
    expect(returnToHand).toHaveBeenCalledWith(["green-tamer"]);
    expect(orderCards).toHaveBeenCalledWith(ctx, {
      candidates: ["vegetation", "fairy", "data-squad", "red-tamer", "plain"],
      visibleCards: expect.any(Array),
      destination: "deckBottom",
    });
    expect(returnToDeck).toHaveBeenCalledWith(["plain", "red-tamer", "data-squad", "fairy", "vegetation"], {
      toTop: false,
    });
  });

  it("returns a selected card to the bottom too when moving it to hand fails", async () => {
    const match = { instanceId: "match", cardId: "MATCH", ownerSeat: 0 as Seat, faceUp: false };
    const other = { instanceId: "other", cardId: "OTHER", ownerSeat: 0 as Seat, faceUp: false };
    const cardSource = source();
    const returnToDeck = vi.fn(async () => []);
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ deck: [match, other] }),
        definitionOf: (card: { cardId: string }) => definition({ types: card.cardId === "MATCH" ? ["Fairy"] : [] }),
      },
      ask: {
        selectCards: async () => [match.instanceId],
        orderCards: async (_ctx: EffectContext, request: { candidates: string[] }) => request.candidates,
      },
      fx: { reveal: async () => [match, other], returnToHand: async () => [], returnToDeck },
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);

    expect(returnToDeck).toHaveBeenCalledWith([match.instanceId, other.instanceId], { toTop: false });
  });
});

describe("BT26-036 public engine behavior", () => {
  it("plays for 3, adds an exact green Tamer match, and returns the other revealed cards face down", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "lalamon" }],
          deck: [
            { card: "BT13-100", as: "greenTamer" },
            { card: "BT1-009", as: "plain" },
            { card: "BT1-085", as: "redTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lalamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2 && s.state.players[0]!.deck.every((card) => !card.faceUp));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greenTamer").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("plain").instanceId,
      s.inst("redTamer").instanceId,
    ]);
    expect(s.state.players[0]!.deck.every((card) => !card.faceUp)).toBe(true);
  });

  it("When Moving fires only for this permanent and resolves against an available short deck", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          deck: [{ card: "BT13-100", as: "match" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("match").instanceId]);
  });

  it("binds When Moving to this exact permanent rather than another Digimon's move", () => {
    const cardSource = source("self");
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnMove, cardSource)[0]!;

    expect(effect.canTrigger({ source: cardSource, trigger: { movedPermanentId: "self" } } as EffectContext)).toBe(
      true,
    );
    expect(effect.canTrigger({ source: cardSource, trigger: { movedPermanentId: "other" } } as EffectContext)).toBe(
      false,
    );
  });

  it("inherits an optional once-per-turn suspension and never offers an already-suspended Digimon", async () => {
    const host = {
      permanentId: "host",
      topCard: { cardId: "HOST" },
      stack: [{ cardId: CARD_ID }],
    };
    const fresh = { permanentId: "fresh", topCard: { cardId: "DIGIMON" }, isSuspended: false };
    const exhausted = { permanentId: "exhausted", topCard: { cardId: "DIGIMON" }, isSuspended: true };
    const players = [{ battleArea: [host] }, { battleArea: [fresh, exhausted] }];
    const cardSource = source("host");
    const chooseTargets = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) => [
      request.candidates[0]!,
    ]);
    const suspend = vi.fn(async (ids: string[]) => ids);
    const ctx = {
      source: cardSource,
      game: {
        player: (seat: Seat) => players[seat],
        opponentOf: () => 1 as Seat,
        definitionOf: () => definition(),
      },
      ask: { chooseTargets },
      fx: { suspend },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnAllyAttack, cardSource)[0]!;

    expect(effect).toMatchObject({ isInherited: true, optional: true, maxPerTurn: 1 });
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(chooseTargets).toHaveBeenCalledWith(ctx, { candidates: ["fresh"], min: 1, max: 1 });
    expect(suspend).toHaveBeenCalledWith(["fresh"]);
  });

  it("uses the Lv.2 DATA SQUAD alternate evolution path for cost 0 and rejects a trait near-miss", async () => {
    const valid = setupEngine({
      0: {
        breeding: { card: "BT25-002", as: "dataSquadEgg" },
        hand: [{ card: CARD_ID, as: "lalamon" }],
      },
    });
    valid.state.memory = 0;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("dataSquadEgg").permanentId,
        instanceId: valid.inst("lalamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("dataSquadEgg").topCard.cardId === CARD_ID);
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "plainEgg" },
        hand: [{ card: CARD_ID, as: "lalamon" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainEgg").permanentId,
        instanceId: invalid.inst("lalamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
  });
});
