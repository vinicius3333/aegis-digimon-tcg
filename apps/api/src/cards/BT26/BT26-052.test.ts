import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-052.js";
import "../index.js";

const CARD_ID = "BT26-052";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT26",
    nameEn: over.nameEn ?? "Pristimon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Black"] as never),
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
    instanceId: "pristimon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-052 [On Play] reveal and add", () => {
  it("does nothing cleanly when the deck is empty", async () => {
    const source = makeSource();
    const reveal = vi.fn();
    const returnToHand = vi.fn();
    const returnToDeck = vi.fn();
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;

    await effect.resolve({
      source,
      game: { player: () => ({ deck: [] }) },
      fx: { reveal, returnToHand, returnToDeck },
      ask: {},
    } as unknown as EffectContext);

    expect(reveal).not.toHaveBeenCalled();
    expect(returnToHand).not.toHaveBeenCalled();
    expect(returnToDeck).not.toHaveBeenCalled();
  });

  it("requires one card from each matching group when candidates are available", async () => {
    const revealed = [
      { instanceId: "glowing", cardId: "GLOWING" },
      { instanceId: "beatbreak", cardId: "BEATBREAK" },
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
          colors: card.cardId === "BEATBREAK" ? (["Black"] as never) : ([] as never),
          types: card.cardId === "GLOWING" ? ["Glowing Dawn"] : card.cardId === "BEATBREAK" ? ["BEATBREAK"] : [],
        }),
    } as unknown as GameAccess;
    const fx = {
      reveal: vi.fn<(...args: any[]) => any>(async () => revealed),
      returnToHand: vi.fn<(...args: any[]) => any>(async (ids: string[]) => returnedToHand.push(ids)),
      returnToDeck: vi.fn<(...args: any[]) => any>(async (ids: string[]) => returnedToDeck.push(ids)),
    } as unknown as Primitives;
    const ask = {
      selectCards: vi.fn<(...args: any[]) => any>(
        async (_ctx: unknown, opts: { candidates: string[]; min: number }) => {
          selectedMins.push(opts.min);
          return [opts.candidates[0]!];
        },
      ),
    } as unknown as EffectContext["ask"];
    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    await effect.resolve(ctx);

    expect(selectedMins).toEqual([1, 1]);
    expect(returnedToHand).toEqual([["glowing", "beatbreak"]]);
    expect(returnedToDeck).toEqual([["other"]]);
  });
});

describe("BT26-052 public engine behavior", () => {
  it("uses the Lv.2 [Glowing Dawn] alternate evolution path on a non-black breeding card for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT26-004", as: "purpleGlowingDawnEgg" },
        hand: [{ card: CARD_ID, as: "pristimon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleGlowingDawnEgg").permanentId,
        instanceId: s.inst("pristimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleGlowingDawnEgg").topCard.instanceId === s.inst("pristimon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("purpleGlowingDawnEgg").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("purpleGlowingDawnEgg").stack.map((card) => card.cardId)).toEqual(["BT26-004"]);
  });

  it("adds one card for each mandatory independent slot and bottoms a non-black BEATBREAK card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "pristimon" }],
          deck: [
            { card: "BT25-035", as: "yellowGlowing" },
            { card: "BT26-093", as: "blackBeatbreak" },
            { card: "BT25-079", as: "purpleBeatbreak" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("yellowGlowing").instanceId, s.inst("blackBeatbreak").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pristimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("yellowGlowing").instanceId,
      s.inst("blackBeatbreak").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("purpleBeatbreak").instanceId]);
    const choices = s.decisions.filter((decision) => decision.req.kind === "selectCards");
    expect(choices).toHaveLength(2);
    expect(choices.every((decision) => decision.req.options?.min === 1)).toBe(true);
  });

  it("allocates an overlapping black Glowing Dawn/BEATBREAK card to the second slot when another first-slot card exists", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "played" }],
          deck: [
            { card: "BT25-035", as: "firstSlot" },
            { card: CARD_ID, as: "overlapSecond" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("firstSlot").instanceId,
      s.inst("overlapSecond").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("uses one overlap-only card for only one slot and returns every unmatched revealed card to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "played" }],
          deck: [
            { card: CARD_ID, as: "onlyMatch" },
            { card: "BT1-009", as: "restOne" },
            { card: "BT1-013", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("onlyMatch").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
    expect(s.decisions.filter((decision) => decision.req.kind === "selectCards")).toHaveLength(1);
  });

  it("reveals the available short deck, makes no choices without matches, and returns both cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "played" }],
        deck: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-013", as: "second" },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every((card) => !card.faceUp));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.decisions.filter((decision) => decision.req.kind === "selectCards")).toHaveLength(0);
  });

  it("grants inherited Reboot only while Pristimon is under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-024", as: "host", under: [{ card: CARD_ID, as: "inheritedPristimon" }] },
          { card: CARD_ID, as: "topPristimon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("topPristimon"), "Reboot")).toBe(false);
  });
});
