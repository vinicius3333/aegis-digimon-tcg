import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT26-070.js";
import "../index.js";

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
  it("digivolves from a non-purple level 3 [Glowing Dawn] Digimon for the alternate cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "base" }],
          hand: [{ card: CARD_ID, as: "nightchiropmon" }],
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
        instanceId: s.inst("nightchiropmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("nightchiropmon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("grants Retaliation only while it is an inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-075", as: "host", under: [CARD_ID] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Retaliation")).toBe(false);
  });

  it("draws first, then mandates exactly 1 hand discard at both printed timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const hand = [{ instanceId: "kept", cardId: "KEEP" }] as CardInstance[];
      const draw = vi.fn(async () => {
        hand.push({ instanceId: "drawn", cardId: "DRAWN" } as CardInstance);
        return [hand[1]!];
      });
      const trash = vi.fn(async () => []);
      const cardSource = source();
      const ctx = {
        source: cardSource,
        trigger: {},
        game: { player: () => ({ hand }) },
        ask: {
          selectCards: vi.fn(async (_ctx, opts: { candidates: string[]; min: number; max: number }) => {
            expect(opts).toMatchObject({ candidates: ["kept", "drawn"], min: 1, max: 1 });
            return ["drawn"];
          }),
        },
        fx: { draw, trash },
      } as unknown as EffectContext;
      const effect = getEffectModule(CARD_ID)!.effectsForTiming(timing, cardSource)[0]!;

      expect(effect.optional).toBe(false);
      await effect.resolve(ctx);
      expect(draw).toHaveBeenCalledWith(0, 1);
      expect(trash).toHaveBeenCalledWith(["drawn"], { byEffectSeat: 0 });
    }
  });

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
      trashDigivolutionCards: vi.fn<(...args: any[]) => any>(async (_host: string, ids: string[]) => {
        firstSelection.push(ids);
        return ids.map((instanceId) => ({ instanceId, cardId: "UNDER" }));
      }),
      gainMemory: vi.fn<(...args: any[]) => any>(),
      useOptionFromHand: vi.fn<(...args: any[]) => any>(async () => undefined),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) =>
        opts.candidates.slice(0, 2),
      ),
    } as unknown as EffectContext["ask"];
    const cardSource = source();
    const ctx = { source: cardSource, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDeclaration, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(firstSelection).toEqual([["one-bottom"], ["two-bottom"]]);
  });

  it("does not use an Option when only one of the two required cards is actually trashed (Q7092)", async () => {
    const tamers = ["bottom", "next"].map((instanceId, index) => ({
      permanentId: `tamer-${index}`,
      inBreeding: false,
      topCard: { instanceId: `tamer-top-${index}`, cardId: "TAMER" },
      stack: [{ instanceId, cardId: "UNDER", faceUp: false }],
    }));
    const option = { instanceId: "option", cardId: "OPTION" } as CardInstance;
    const player = { seat: 0 as Seat, battleArea: tamers, trash: [option], hand: [] };
    const game = {
      player: () => player,
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "TAMER"
          ? def("TAMER", [CardKind.Tamer])
          : card.cardId === "OPTION"
            ? def("OPTION", [CardKind.Option], ["Glowing Dawn"])
            : def(card.cardId, [CardKind.Digimon]),
    } as unknown as GameAccess;
    const useOptionFromHand = vi.fn();
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: {
        optional: vi.fn(async () => true),
        selectCards: vi.fn(async (_ctx, opts: { candidates: string[]; max: number }) =>
          opts.max === 2 ? opts.candidates : ["option"],
        ),
      },
      fx: {
        trashDigivolutionCards: vi
          .fn()
          .mockResolvedValueOnce([{ instanceId: "bottom", cardId: "UNDER" }])
          .mockResolvedValueOnce([]),
        useOptionFromHand,
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDeclaration, ctx.source)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledTimes(2);
    expect(useOptionFromHand).not.toHaveBeenCalled();
  });

  it("can use a [Glowing Dawn] Option that enters trash while paying the cost", async () => {
    const underOption = { instanceId: "new-option", cardId: "OPTION", faceUp: false } as CardInstance;
    const otherUnder = { instanceId: "other", cardId: "UNDER", faceUp: false } as CardInstance;
    const tamers = [underOption, otherUnder].map((card, index) => ({
      permanentId: `tamer-${index}`,
      inBreeding: false,
      topCard: { instanceId: `tamer-top-${index}`, cardId: "TAMER" },
      stack: [card],
    }));
    const player = { seat: 0 as Seat, battleArea: tamers, trash: [] as CardInstance[], hand: [] };
    const game = {
      player: () => player,
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "TAMER"
          ? def("TAMER", [CardKind.Tamer])
          : card.cardId === "OPTION"
            ? def("OPTION", [CardKind.Option], ["Glowing Dawn"])
            : def(card.cardId, [CardKind.Digimon]),
    } as unknown as GameAccess;
    const useOptionFromHand = vi.fn(async () => []);
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: {
        optional: vi.fn(async () => true),
        selectCards: vi.fn(async (_ctx, opts: { candidates: string[]; max: number }) =>
          opts.max === 2 ? opts.candidates : ["new-option"],
        ),
      },
      fx: {
        trashDigivolutionCards: vi.fn(async (_hostId: string, ids: string[]) => {
          const moved = [underOption, otherUnder].filter((card) => ids.includes(card.instanceId));
          player.trash.push(...moved);
          return moved;
        }),
        gainMemory: vi.fn(),
        useOptionFromHand,
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDeclaration, ctx.source)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
    expect(useOptionFromHand).toHaveBeenCalledWith(ctx, "new-option", 3);
    expect(ctx.fx.gainMemory).toHaveBeenCalledWith(-1);
  });
});
