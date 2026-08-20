import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectDuration, EffectTiming, getCardDefinition, type Seat } from "@aegis/shared";
import { printedKeywordsOf } from "../../engine/combat/keywords.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-032.js";
import "../index.js";

const CARD_ID = "BT26-032";

describe("BT26-032 Ceresmon", () => {
  it("allows either player's Digimon to pay the suspend cost and pays reduced Option use cost (Q7001)", async () => {
    const own = { permanentId: "own", inBreeding: false, isSuspended: false, topCard: { cardId: "OWN" } };
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      isSuspended: false,
      topCard: { cardId: "OPP" },
    };
    const option = { instanceId: "option", cardId: "OPTION" };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "ceresmon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    const suspend = vi.fn<(...args: any[]) => any>(async (ids: string[]) => ids);
    const gainMemory = vi.fn<(...args: any[]) => any>();
    const useOptionFromHand = vi.fn<(...args: any[]) => any>(async () => []);
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) => (seat === 0 ? { hand: [option], battleArea: [own] } : { battleArea: [opponent] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "OPTION"
            ? { kinds: [CardKind.Option], types: ["TS"], playCost: 7 }
            : { kinds: [CardKind.Digimon] },
      },
      ask: {
        chooseTargets: vi.fn<(...args: any[]) => any>(async () => [opponent.permanentId]),
        selectCards: vi.fn<(...args: any[]) => any>(async () => [option.instanceId]),
      },
      fx: { suspend, gainMemory, useOptionFromHand },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);

    expect(suspend).toHaveBeenCalledWith([opponent.permanentId]);
    expect(gainMemory).not.toHaveBeenCalled();
    expect(useOptionFromHand).toHaveBeenCalledWith(ctx, option.instanceId, 7, {
      payCost: true,
      costDelta: 5,
    });
  });

  it("does not play or use a card when the chosen suspension cost fails", async () => {
    const cost = { permanentId: "cost", topCard: { cardId: "DIGIMON" }, isSuspended: false };
    const candidate = { instanceId: "candidate", cardId: "CANDIDATE" };
    const source = {
      ownerSeat: 0 as Seat,
      permanent: () => ({ permanentId: "ceresmon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const playFromHand = vi.fn();
    const useOptionFromHand = vi.fn();
    const ctx = {
      source,
      game: {
        opponentOf: () => 1 as Seat,
        player: (seat: Seat) => (seat === 0 ? { hand: [candidate], battleArea: [cost] } : { battleArea: [] }),
        definitionOf: (card: { cardId: string }) => ({
          kinds: [CardKind.Digimon],
          types: card.cardId === "CANDIDATE" ? ["Vegetation"] : [],
        }),
      },
      ask: { chooseTargets: async () => [cost.permanentId], selectCards: vi.fn() },
      fx: { modifyDP: vi.fn(), suspend: async () => [], playFromHand, useOptionFromHand },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!.resolve(ctx);

    expect(ctx.ask.selectCards).not.toHaveBeenCalled();
    expect(playFromHand).not.toHaveBeenCalled();
    expect(useOptionFromHand).not.toHaveBeenCalled();
  });

  it("Option Main may decline suspension but still locks 3 independently chosen permanents (Q7003)", async () => {
    const permanents = Array.from({ length: 4 }, (_, index) => ({
      permanentId: `opponent-${index}`,
      topCard: { cardId: index === 3 ? "TAMER" : "DIGIMON" },
      isSuspended: index === 3,
      inBreeding: false,
    }));
    const source = { ownerSeat: 0 as Seat } as CardSource;
    const chooseTargets = vi.fn(async (_ctx: EffectContext, request: { candidates: string[]; max: number }) =>
      request.max === 3 ? request.candidates.slice(1, 4) : request.candidates.slice(0, request.max),
    );
    const suspend = vi.fn();
    const restrict = vi.fn();
    const ctx = {
      source,
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({ battleArea: permanents }),
        definitionOf: (card: { cardId: string }) => ({
          kinds: [card.cardId === "TAMER" ? CardKind.Tamer : CardKind.Digimon],
        }),
      },
      ask: { optional: async () => false, chooseTargets },
      fx: { suspend, restrict },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnUseOption, source)[0]!.resolve(ctx);

    expect(suspend).not.toHaveBeenCalled();
    expect(restrict.mock.calls).toEqual(
      ["opponent-1", "opponent-2", "opponent-3"].map((id) => [id, "unsuspend", EffectDuration.UntilOpponentTurnEnd]),
    );
  });

  it("Option Main suspends exactly 2 after acceptance rather than permitting a partial payment", async () => {
    const permanents = Array.from({ length: 3 }, (_, index) => ({
      permanentId: `opponent-${index}`,
      topCard: { cardId: "DIGIMON" },
      isSuspended: false,
      inBreeding: false,
    }));
    const source = { ownerSeat: 0 as Seat } as CardSource;
    const chooseTargets = vi.fn(async (_ctx: EffectContext, request: { candidates: string[]; max: number }) =>
      request.candidates.slice(0, request.max),
    );
    const suspend = vi.fn(async (ids: string[]) => ids);
    const ctx = {
      source,
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({ battleArea: permanents }),
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      },
      ask: { optional: async () => true, chooseTargets },
      fx: { suspend, restrict: vi.fn() },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnUseOption, source)[0]!.resolve(ctx);

    expect(chooseTargets).toHaveBeenCalledWith(ctx, {
      candidates: ["opponent-0", "opponent-1", "opponent-2"],
      min: 2,
      max: 2,
    });
    expect(suspend).toHaveBeenCalledWith(["opponent-0", "opponent-1"]);
  });

  it("grants the rule Vegetation trait through public continuous state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: CARD_ID,
            as: "ceresmon",
            under: [
              { card: "BT3-056", as: "lowerCeresmon" },
              { card: "BT25-059", as: "topCeresmon" },
            ],
          },
        ],
      },
    });

    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("ceresmon"), "Vegetation")).toBe(true);
    const card = getCardDefinition(CARD_ID)!;
    expect(printedKeywordsOf(card.effectText)).toContain("Alliance");
    expect(printedKeywordsOf(card.optionEffect)).toContain("UseReq");
  });

  it("Succession confers only the topmost face-up Ceresmon digivolution card", async () => {
    const stack = [
      { instanceId: "lower", cardId: "CERESMON", faceUp: true },
      { instanceId: "hidden", cardId: "CERESMON", faceUp: false },
      { instanceId: "topmost", cardId: "CERESMON", faceUp: true },
    ];
    const permanent = { permanentId: "host", stack };
    const source = {
      ownerSeat: 0 as Seat,
      permanent: () => permanent,
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const conferStackEffects = vi.fn();
    const effect = module
      .effectsForTiming(EffectTiming.None, source)
      .find((candidate) => candidate.effectKey.endsWith("succession-ceresmon"))!;
    const ctx = {
      source,
      game: { definitionOf: () => ({ nameEn: "Ceresmon" }) },
      fx: { conferStackEffects },
    } as unknown as EffectContext;

    await effect.resolve(ctx);

    expect(conferStackEffects).toHaveBeenCalledWith("host", "topmost", EffectDuration.Permanent);
    expect(conferStackEffects).toHaveBeenCalledOnce();
  });

  it("uses the play-cost-12 Ceresmon alternate evolution gate for exact cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-059", as: "baseCeresmon" }],
          hand: [{ card: CARD_ID, as: "newCeresmon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("baseCeresmon").permanentId,
        instanceId: s.inst("newCeresmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("baseCeresmon").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("baseCeresmon").stack.at(-1)?.cardId).toBe("BT25-059");
  });

  it("finishes the full effect before the DP-zero rule check and pays the locally reduced play cost (Q7000)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-059", as: "baseCeresmon" }],
          hand: [
            { card: CARD_ID, as: "newCeresmon" },
            { card: "BT1-074", as: "togemon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-083", as: "zeroDpTarget", dp: 5000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("baseCeresmon").permanentId,
        instanceId: s.inst("newCeresmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-074"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-074")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // 2 for Ceresmon's alternate evolution, then Togemon's 6 - 5 = 1.
    expect(s.state.memory).toBe(-1);
  });

  it("stacks Ceresmon's -5 with Bacchusmon's own -5 during an effect-driven paid play (Q7002)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "baseCeresmon" },
            { card: "BT25-059", as: "levelSixPartner" },
          ],
          hand: [
            { card: CARD_ID, as: "newCeresmon" },
            { card: "BT25-077", as: "bacchusmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("baseCeresmon").permanentId,
        instanceId: s.inst("newCeresmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-077"));

    // Evolution 2, then printed 12 - Ceresmon 5 - Bacchusmon 5 = 2.
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-077")).toBe(false);
  });

  it("uses Famis through the TS requirement without a green color source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "option" }],
          battleArea: [{ card: "BT26-069", as: "purpleTs" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);

    const rejected = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    rejected.state.memory = 5;
    await rejected.ready();
    expect(
      rejected.engine.applyIntent(0, {
        type: "playCard",
        instanceId: rejected.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("honors a runtime-granted TS trait for Famis Use Req.", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT1-051", as: "plainYellow" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();
    advance(s.engine).ledgers.continuous.addNameTraitGrant(
      s.perm("plainYellow").permanentId,
      "trait",
      ["TS"],
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
  });
});
