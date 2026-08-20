import { describe, expect, it, vi } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT26-061.js";
import "../index.js";

const CARD_ID = "BT26-061";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT26",
    nameEn: over.nameEn ?? "Chiropmon",
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
    instanceId: "chiropmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-061 [On Play] reveal and add", () => {
  it("digivolves from a yellow level 2 [Glowing Dawn] card for alternate cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT25-003", as: "base" },
        hand: [{ card: CARD_ID, as: "chiropmon" }],
        deck: ["BT5-022"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chiropmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("chiropmon").instanceId);
    expect(s.state.memory).toBe(0);
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
          colors: card.cardId === "BEATBREAK" ? (["Purple"] as never) : ([] as never),
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

  it("does not let one dual-matching reveal fill both mandatory slots", async () => {
    const revealed = [
      { instanceId: "dual", cardId: "DUAL" },
      { instanceId: "near", cardId: "NEAR" },
      { instanceId: "other", cardId: "OTHER" },
    ] as CardInstance[];
    const returnToHand = vi.fn();
    const returnToDeck = vi.fn();
    const game = {
      player: () => ({ deck: revealed, hand: [] }),
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "DUAL"
          ? fakeDef({ cardId: "DUAL", colors: ["Purple"] as never, types: ["Glowing Dawn", "BEATBREAK"] })
          : card.cardId === "NEAR"
            ? fakeDef({ cardId: "NEAR", colors: ["Purple"] as never, types: ["BEAT BREAK"] })
            : fakeDef({ cardId: card.cardId, colors: ["Red"] as never, types: ["BEATBREAK"] }),
    } as unknown as GameAccess;
    const source = makeSource();
    const ctx = {
      source,
      trigger: {},
      game,
      ask: { selectCards: vi.fn(async (_ctx, opts: { candidates: string[] }) => [opts.candidates[0]!]) },
      fx: { reveal: vi.fn(async () => revealed), returnToHand, returnToDeck },
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.resolve(ctx);
    expect(returnToHand).toHaveBeenCalledWith(["dual"]);
    expect(returnToDeck).toHaveBeenCalledWith(["near", "other"], { toTop: false });
    expect(ctx.ask.selectCards).toHaveBeenCalledTimes(1);
  });

  it("inherits draw-then-trash once per turn and attributes the discarded card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-070", as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT5-022", as: "discard" }],
          deck: [
            { card: "BT5-022", as: "draw-one" },
            { card: "BT5-022", as: "draw-two" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnAllyAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.deck.length).toBe(1);

    await advance(s.engine).fire(EffectTiming.OnAllyAttack, s.perm("host"));
    expect(s.state.players[0]!.deck.length).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
