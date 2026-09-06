import { describe, expect, it, vi } from "vitest";
import {
  CardKind,
  EffectTiming,
  getCardDefinition,
  type CardDefinition,
  type CardInstance,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT26-070.js";
import { compiled } from "./BT26-070.js";
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
  it("encodes the full two-card Tamer cost and reduced Glowing Dawn Option play", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "NightChiropmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Beastkin", "Glowing Dawn", "BEATBREAK"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 2,
          target: { filter: { playCostLte: 99 } },
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 2 },
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Retaliation" }] });
  });

  it("trashes two bottom face-down Tamer cards and uses a Glowing Dawn Option from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "nightchiropmon" },
            { card: "BT25-088", as: "tamerA", under: [{ card: "BT1-001", as: "a", faceUp: false }] },
            { card: "BT25-088", as: "tamerB", under: [{ card: "BT1-002", as: "b", faceUp: false }] },
          ],
          trash: [
            { card: "P-236", as: "glowingDawn" },
            { card: "BT1-090", as: "nonGlowingOption" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 2;
    const optionId = s.inst("glowingDawn").instanceId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("nightchiropmon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === optionId));

    expect(s.perm("tamerA").stack).toHaveLength(0);
    expect(s.perm("tamerB").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("nonGlowingOption").instanceId,
    );
    expect(
      s.state.players[0]!.trash.some(
        ({ instanceId, faceUp }) => instanceId === s.inst("a").instanceId && faceUp === true,
      ),
    ).toBe(true);
    expect(
      s.state.players[0]!.trash.some(
        ({ instanceId, faceUp }) => instanceId === s.inst("b").instanceId && faceUp === true,
      ),
    ).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("may decline the legal Main effect without trashing Tamers or using the Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "nightchiropmon" },
            { card: "BT25-088", as: "tamerA", under: [{ card: "BT1-001", as: "a", faceUp: false }] },
            { card: "BT25-088", as: "tamerB", under: [{ card: "BT1-002", as: "b", faceUp: false }] },
          ],
          trash: [{ card: "P-236", as: "glowingDawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const optionId = s.inst("glowingDawn").instanceId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("nightchiropmon"));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("nightchiropmon").permanentId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.perm("tamerA").stack).toHaveLength(1);
    expect(s.perm("tamerB").stack).toHaveLength(1);
    expect(s.state.memory).toBe(20);
  });

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

  it("publicly plays from hand and resolves Draw 1 then hand trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "nightchiropmon" },
            { card: "BT1-002", as: "discarded" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nightchiropmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-002");
  });

  it("executes inherited Retaliation after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-038", as: "host", under: [CARD_ID] }] },
        1: { battleArea: [{ card: "BT26-060", as: "defender", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(defenderId);
  });

  it.each(["ascension-first", "retaliation-first"] as const)(
    "respects BT26-075 Ascension ordering when inherited Retaliation is pending (%s)",
    async (orderChoice) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT26-075", as: "host", under: [CARD_ID] }] },
          1: { battleArea: [{ card: "BT26-060", as: "defender", suspended: true }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      const defenderId = s.perm("defender").permanentId;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const pending = s.state.pendingDecision!;
      const keys = (JSON.parse(pending.payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? [];
      const chosen =
        orderChoice === "ascension-first"
          ? keys.find((key) => key.startsWith("ascension/"))
          : keys.find((key) => key.startsWith("on-deletion/"));
      expect(chosen).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "orderTriggers", order: [chosen!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

      expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toContain("BT26-075");
      expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId)).toBe(
        orderChoice === "ascension-first",
      );
    },
  );

  it("draws first, then mandates exactly 1 hand discard at both printed timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const hand = [{ instanceId: "kept", cardId: "KEEP" }] as CardInstance[];
      const draw = vi.fn<Primitives["draw"]>(async () => {
        hand.push({ instanceId: "drawn", cardId: "DRAWN" } as CardInstance);
        return [hand[1]!];
      });
      const trash = vi.fn<Primitives["trash"]>(async () => []);
      const cardSource = source();
      const ctx = {
        source: cardSource,
        trigger: {},
        game: {
          player: () => ({ hand }),
          opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
          definitionOf: (card: { cardId: string }) => def(card.cardId, [CardKind.Digimon]),
        },
        ask: {
          selectCards: vi.fn<DecisionApi["selectCards"]>(async (_ctx, opts) => {
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
      trashDigivolutionCards: vi.fn<Primitives["trashDigivolutionCards"]>(async (_host, ids) => {
        firstSelection.push(ids);
        return ids.map((instanceId) => ({ instanceId, cardId: "UNDER" }) as CardInstance);
      }),
      gainMemory: vi.fn<Primitives["gainMemory"]>(),
      useOptionFromHand: vi.fn<Primitives["useOptionFromHand"]>(async () => []),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn<DecisionApi["optional"]>(async () => true),
      selectCards: vi.fn<DecisionApi["selectCards"]>(async (_ctx, opts) => opts.candidates.slice(0, 2)),
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
    const useOptionFromHand = vi.fn<Primitives["useOptionFromHand"]>(async () => []);
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: {
        optional: vi.fn<DecisionApi["optional"]>(async () => true),
        selectCards: vi.fn<DecisionApi["selectCards"]>(async (_ctx, opts) =>
          opts.max === 2 ? opts.candidates : ["option"],
        ),
      },
      fx: {
        trashDigivolutionCards: vi
          .fn<Primitives["trashDigivolutionCards"]>()
          .mockResolvedValueOnce([{ instanceId: "bottom", cardId: "UNDER" } as CardInstance])
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
    const useOptionFromHand = vi.fn<Primitives["useOptionFromHand"]>(async () => []);
    const gainMemoryForSeat = vi.fn<Primitives["gainMemoryForSeat"]>();
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: {
        optional: vi.fn<DecisionApi["optional"]>(async () => true),
        selectCards: vi.fn<DecisionApi["selectCards"]>(async (_ctx, opts) =>
          opts.max === 2 ? opts.candidates : ["new-option"],
        ),
      },
      fx: {
        trashDigivolutionCards: vi.fn<Primitives["trashDigivolutionCards"]>(async (_hostId, ids) => {
          const moved = [underOption, otherUnder].filter((card) => ids.includes(card.instanceId));
          player.trash.push(...moved);
          return moved;
        }),
        gainMemoryForSeat,
        useOptionFromHand,
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDeclaration, ctx.source)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
    expect(gainMemoryForSeat).toHaveBeenCalledWith(0, -1);
    expect(useOptionFromHand).toHaveBeenCalledWith(
      expect.any(Object),
      "new-option",
      3,
      expect.objectContaining({ payCost: true, costDelta: 2, paymentHandled: true }),
    );
  });

  it("does not combine two copies' reductions for one Option use (Q7093)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
            { card: "BT25-088", as: "tamerA", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "BT25-088", as: "tamerB", under: [{ card: "BT1-002", faceUp: false }] },
            { card: "BT25-088", as: "tamerC", under: [{ card: "BT1-003", faceUp: false }] },
            { card: "BT25-088", as: "tamerD", under: [{ card: "BT1-004", faceUp: false }] },
          ],
          trash: [{ card: "P-236", as: "glowingDawn" }],
          deck: ["BT25-032", "BT25-033", "BT25-034"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("first"));
    await settle(() => !s.state.players[0]!.trash.some(({ cardId }) => cardId === "P-236"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(2);

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("second"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
