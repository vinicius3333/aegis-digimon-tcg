import { describe, expect, it, vi } from "vitest";
import {
  CardKind,
  EffectTiming,
  Phase,
  digivolutionRequirementsFor,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-018.js";
import "../index.js";

const CARD_ID = "BT26-018";

function definition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: over.colors ?? [],
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 1000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(): CardSource {
  return {
    instanceId: "sangomon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "sangomon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-018 reveal movement boundaries", () => {
  it("requires one eligible add, orders every actual remainder, and retains a pick whose hand move fails", async () => {
    const cards = [
      { instanceId: "aqua", cardId: "AQUA" },
      { instanceId: "sea", cardId: "SEA" },
      { instanceId: "ds", cardId: "DS" },
      { instanceId: "plain", cardId: "PLAIN" },
    ];
    const cardSource = source();
    const selectCards = vi.fn(async () => ["aqua"]);
    const orderCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) =>
      [...request.candidates].reverse(),
    );
    const returnToDeck = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        player: (seat: Seat) => (seat === 0 ? { deck: cards } : { battleArea: [] }),
        opponentOf: () => 1 as Seat,
        definitionOf: (card: { cardId: string }) =>
          definition({
            types:
              card.cardId === "AQUA"
                ? ["Aqua"]
                : card.cardId === "SEA"
                  ? ["Sea Animal"]
                  : card.cardId === "DS"
                    ? ["DS"]
                    : [],
          }),
      },
      ask: { selectCards, orderCards },
      fx: {
        reveal: async () => cards,
        returnToHand: async () => [],
        returnToDeck,
      } as unknown as Primitives,
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(ctx, { candidates: ["aqua", "sea", "ds"], min: 1, max: 1 });
    expect(orderCards).toHaveBeenCalledWith(ctx, {
      candidates: ["aqua", "sea", "ds", "plain"],
      visibleCards: cards,
      destination: "deckBottom",
    });
    expect(returnToDeck).toHaveBeenCalledWith(["plain", "ds", "sea", "aqua"], { toTop: false });
  });
});

describe("BT26-018 public engine behavior", () => {
  it("plays for 3, resolves reveal zones/order, then trashes the opponent's bottom source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sangomon" }],
          deck: [
            { card: "BT26-020", as: "dsMatch" },
            { card: "BT1-009", as: "plainOne" },
            { card: "BT1-010", as: "plainTwo" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-083",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-002", as: "remaining" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1 && s.state.players[0]!.deck.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("dsMatch").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("plainOne").instanceId,
      s.inst("plainTwo").instanceId,
    ]);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("When Moving still processes Then with an empty deck and binds only to this mover", async () => {
    const s = setupEngine({
      0: { breeding: { card: CARD_ID, as: "mover" } },
      1: {
        battleArea: [{ card: "BT1-083", as: "target", under: [{ card: "BT1-001", as: "bottom" }] }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("grants rule Aquatic to itself and inherited Jamming only to a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "topSangomon" },
          { card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "sourceSangomon" }] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("topSangomon"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("topSangomon"), "Jamming")).toBe(false);
  });

  it("uses the normalized Lv.2 DS alternate requirement at exact cost 0", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([{ level: 2, traits: ["DS"], cost: 0, isAlternate: true }]);
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-002", as: "dsEgg" },
        hand: [{ card: CARD_ID, as: "sangomon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dsEgg").permanentId,
        instanceId: s.inst("sangomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dsEgg").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("dsEgg").stack.map((card) => card.cardId)).toEqual(["EX8-002"]);
  });
});
