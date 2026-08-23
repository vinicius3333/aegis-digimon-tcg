import { CardColor, CardKind, EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT26-074.js";
import { compiled } from "./BT26-074.js";

const CARD_ID = "BT26-074";

it("encodes the shared once-per-turn Titan Option use and inherited lowest-level deletion", () => {
  for (const effect of compiled.effects?.slice(0, 3) ?? []) {
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "trash-hand-use-titan-option-from-trash",
      actions: [
        { kind: "UseOptionWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 2, condition: { kind: "isYourTurn" } },
      ],
    });
  }
  expect(compiled.effects?.[3]).toMatchObject({
    isInherited: true,
    actions: [{ kind: "Delete", target: { filter: { superlative: "lowestLevel" } } }],
  });
});

it("exposes the printed level-4 TS evolution requirement", () => {
  expect(compiled.digivolutionRequirement).toContainEqual({ level: 4, traits: ["TS"], cost: 3, isAlternate: true });
});

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

function card(instanceId: string, cardId: string): CardInstance {
  return { instanceId, cardId, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

function source(ownersTurn = true): CardSource {
  return {
    instanceId: "cerberusmon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, types: ["Dark Animal", "Titan", "TS"] }),
    permanent: () => ({ permanentId: "cerberusmon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => ownersTurn,
    hasColor: () => true,
  };
}

describe("BT26-074 Cerberusmon", () => {
  it("digivolves from a level 4 [TS] Digimon for the alternate cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-038", as: "base" }],
          hand: [{ card: CARD_ID, as: "cerberusmon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cerberusmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("cerberusmon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("shares one once-per-turn identity across all three timings and is gated to the owner's turn", () => {
    const module = getEffectModule(CARD_ID)!;
    const ownerSource = source();
    const effects = [
      module.effectsForTiming(EffectTiming.OnPlay, ownerSource)[0]!,
      module.effectsForTiming(EffectTiming.WhenDigivolving, ownerSource)[0]!,
      module.effectsForTiming(EffectTiming.OnUseAttack, ownerSource)[0]!,
    ];

    expect(effects.map(({ effectKey }) => effectKey)).toEqual([
      `${CARD_ID}/trash-hand-use-titan-option-from-trash`,
      `${CARD_ID}/trash-hand-use-titan-option-from-trash`,
      `${CARD_ID}/trash-hand-use-titan-option-from-trash`,
    ]);
    expect(effects.every(({ maxPerTurn }) => maxPerTurn === 1)).toBe(true);

    const handCost = card("hand-cost", "HAND");
    const titanOption = card("titan-option", "TITAN-OPTION");
    const game = {
      state: { turnSeat: 1 as Seat },
      player: () => ({ hand: [handCost], trash: [titanOption] }),
      definitionOf: () => definition({ kinds: [CardKind.Option], types: ["Titan"] }),
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    } as unknown as GameAccess;
    const opponentTurnEffect = module.effectsForTiming(EffectTiming.OnPlay, source(false))[0]!;
    const ctx = { source: source(false), game } as unknown as EffectContext;

    expect(opponentTurnEffect.canActivate(ctx)).toBe(false);
  });

  it("filters the mixed trash pool exactly, pays one hand card, charges cost minus 2, and resolves the Option", async () => {
    const handCost = card("hand-cost", "HAND");
    const titanOption = card("titan-option", "TITAN-OPTION");
    const titanDigimon = card("titan-digimon", "TITAN-DIGIMON");
    const nearMatchOption = card("near-option", "NEAR-OPTION");
    const ordinaryOption = card("ordinary-option", "ORDINARY-OPTION");
    const owner = {
      hand: [handCost],
      trash: [titanOption, titanDigimon, nearMatchOption, ordinaryOption],
    };
    const definitions: Record<string, CardDefinition> = {
      "TITAN-OPTION": definition({ cardId: "TITAN-OPTION", kinds: [CardKind.Option], playCost: 5, types: ["Titan"] }),
      "TITAN-DIGIMON": definition({ cardId: "TITAN-DIGIMON", kinds: [CardKind.Digimon], types: ["Titan"] }),
      "NEAR-OPTION": definition({ cardId: "NEAR-OPTION", kinds: [CardKind.Option], types: ["Titanomachy"] }),
      "ORDINARY-OPTION": definition({ cardId: "ORDINARY-OPTION", kinds: [CardKind.Option], types: [] }),
    };
    const game = {
      state: { turnSeat: 0 as Seat },
      player: () => owner,
      definitionOf: (instance: CardInstance) => definitions[instance.cardId] ?? definition({ cardId: instance.cardId }),
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    } as unknown as GameAccess;
    const trash = vi.fn(async () => [handCost]);
    const useOptionFromHand = vi.fn(async () => []);
    const gainMemoryForSeat = vi.fn();
    const selectCards = vi.fn(async (_ctx: EffectContext, request: { candidates: string[] }) => [
      request.candidates[0]!,
    ]);
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: { optional: vi.fn(async () => true), selectCards },
      fx: { trash, gainMemoryForSeat, useOptionFromHand } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, ctx.source)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    // The sole hand-cost candidate is deterministic; the only prompt selects the exact [Titan] Option.
    expect(selectCards).toHaveBeenCalledOnce();
    expect(selectCards).toHaveBeenCalledWith(expect.anything(), {
      candidates: [titanOption.instanceId], min: 0, max: 1,
    });
    expect(trash).toHaveBeenCalledWith([handCost.instanceId], { byEffectSeat: 0 });
    expect(gainMemoryForSeat).toHaveBeenCalledWith(0, -3);
    expect(useOptionFromHand).toHaveBeenCalledWith(
      expect.anything(),
      titanOption.instanceId,
      5,
      expect.objectContaining({ payCost: true, costDelta: 2, paymentHandled: true }),
    );
  });

  it("does not charge memory or use the Option when the hand-trash cost is prevented", async () => {
    const handCost = card("hand-cost", "HAND");
    const titanOption = card("titan-option", "TITAN-OPTION");
    const game = {
      state: { turnSeat: 0 as Seat },
      player: () => ({ hand: [handCost], trash: [titanOption] }),
      definitionOf: (instance: CardInstance) =>
        definition({ cardId: instance.cardId, kinds: [CardKind.Option], playCost: 3, types: ["Titan"] }),
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    } as unknown as GameAccess;
    const gainMemory = vi.fn();
    const useOptionFromHand = vi.fn(async () => []);
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: { optional: vi.fn(async () => true), selectCards: vi.fn(async () => [handCost.instanceId]) },
      fx: {
        trash: vi.fn(async () => []),
        gainMemory,
        useOptionFromHand,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, ctx.source)[0]!;

    await effect.resolve(ctx);

    expect(gainMemory).not.toHaveBeenCalled();
    expect(useOptionFromHand).not.toHaveBeenCalled();
  });

  it("the inherited effect offers only tied lowest-level Digimon and deletes exactly the chosen one", async () => {
    const opponents = [
      { permanentId: "low-a", topCard: card("low-a-card", "LOW-A"), currentLevel: 3, inBreeding: false },
      { permanentId: "low-b", topCard: card("low-b-card", "LOW-B"), currentLevel: 3, inBreeding: false },
      { permanentId: "high", topCard: card("high-card", "HIGH"), currentLevel: 6, inBreeding: false },
      { permanentId: "level-less", topCard: card("level-less-card", "LEVEL-LESS"), inBreeding: false },
      { permanentId: "tamer", topCard: card("tamer-card", "TAMER"), inBreeding: false },
    ];
    const definitions: Record<string, CardDefinition> = {
      "LOW-A": definition({ cardId: "LOW-A", level: 3 }),
      "LOW-B": definition({ cardId: "LOW-B", level: 3 }),
      HIGH: definition({ cardId: "HIGH", level: 6 }),
      "LEVEL-LESS": definition({ cardId: "LEVEL-LESS", level: undefined }),
      TAMER: definition({ cardId: "TAMER", kinds: [CardKind.Tamer], level: 2 }),
    };
    const game = {
      opponentOf: () => 1 as Seat,
      player: (seat: Seat) => ({ battleArea: seat === 1 ? opponents : [] }),
      definitionOf: (instance: CardInstance) => definitions[instance.cardId]!,
      permanentById: (permanentId: string) => opponents.find((permanent) => permanent.permanentId === permanentId),
    } as unknown as GameAccess;
    const chooseTargets = vi.fn(async () => ["low-b"]);
    const deletePermanent = vi.fn(async () => 1);
    const ctx = {
      source: source(),
      trigger: {},
      game,
      ask: { chooseTargets },
      fx: { deletePermanent } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, ctx.source)[0]!;

    expect(effect.isInherited).toBe(true);
    expect(effect.optional).toBe(false);
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(chooseTargets).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      candidates: ["low-a", "low-b"], min: 1, max: 1,
    }));
    expect(deletePermanent).toHaveBeenCalledWith(["low-b"]);
  });
});
