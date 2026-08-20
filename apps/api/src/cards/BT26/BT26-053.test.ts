import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-053.js";
import "../index.js";

const CARD_ID = "BT26-053";

function definition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Black"] as never,
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(): CardSource {
  return {
    instanceId: "wolvermon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition(CARD_ID),
    permanent: () => ({ permanentId: "wolvermon-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-053 Wolvermon", () => {
  it("digivolves from an off-color level 3 [Glowing Dawn] Digimon for cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "base" }],
          hand: [{ card: CARD_ID, as: "wolvermon" }],
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
        instanceId: s.inst("wolvermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("wolvermon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("grants Blocker both as a top-card keyword and from the inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-055", as: "host", under: [CARD_ID] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Blocker")).toBe(true);
  });

  it("uses only an exact [Glowing Dawn] Option with printed cost at most 4 after paying the Tamer cost", async () => {
    const options = [
      { instanceId: "eligible", cardId: "ELIGIBLE" },
      { instanceId: "too-high", cardId: "HIGH" },
      { instanceId: "near", cardId: "NEAR" },
      { instanceId: "digimon", cardId: "DIGIMON" },
    ] as CardInstance[];
    const bottom = { instanceId: "bottom", cardId: "BOTTOM", faceUp: false } as CardInstance;
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { instanceId: "tamer-top", cardId: "TAMER" },
      stack: [bottom],
    };
    const defs: Record<string, CardDefinition> = {
      TAMER: definition("TAMER", { kinds: [CardKind.Tamer] }),
      ELIGIBLE: definition("ELIGIBLE", { kinds: [CardKind.Option], types: ["Glowing Dawn"], playCost: 4 }),
      HIGH: definition("HIGH", { kinds: [CardKind.Option], types: ["Glowing Dawn"], playCost: 5 }),
      NEAR: definition("NEAR", { kinds: [CardKind.Option], types: ["Glowing Dawn Alliance"], playCost: 4 }),
      DIGIMON: definition("DIGIMON", { kinds: [CardKind.Digimon], types: ["Glowing Dawn"], playCost: 4 }),
      BOTTOM: definition("BOTTOM"),
    };
    const installed: SubTriggerInstall[] = [];
    const useOptionFromHand = vi.fn();
    const cardSource = source();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ hand: options, battleArea: [tamer] }),
        permanentById: () => tamer,
        definitionOf: (card: { cardId: string }) => defs[card.cardId]!,
      } as unknown as GameAccess,
      ask: {
        selectCards: vi.fn(async (_ctx, choices: { candidates: string[] }) => {
          expect(choices.candidates).toEqual(["eligible"]);
          return ["eligible"];
        }),
      },
      fx: {
        subscribeSubTrigger: vi.fn((sub) => installed.push(sub)),
        trashDigivolutionCards: vi.fn(async () => [bottom]),
        useOptionFromHand,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("attack-target-switch-use-option"))!;

    await effect.resolve(ctx);
    expect(installed[0]!.oncePerTurnKey).toBe(`wolvermon/${CARD_ID}/all-turns-attack-target-switch-use-option`);
    await installed[0]!.run(ctx);
    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["bottom"], { byEffectSeat: 0 });
    expect(useOptionFromHand).toHaveBeenCalledWith(ctx, "eligible", 4);
  });

  it("does not use the Option and releases the OPT reservation when the bottom-card cost fails", async () => {
    const option = { instanceId: "eligible", cardId: "OPTION" } as CardInstance;
    const bottom = { instanceId: "bottom", cardId: "BOTTOM", faceUp: false } as CardInstance;
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { instanceId: "tamer-top", cardId: "TAMER" },
      stack: [bottom],
    };
    let watcher: SubTriggerInstall | undefined;
    const useOptionFromHand = vi.fn();
    const cardSource = source();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ hand: [option], battleArea: [tamer] }),
        permanentById: () => tamer,
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? definition("TAMER", { kinds: [CardKind.Tamer] })
            : definition(card.cardId, { kinds: [CardKind.Option], types: ["Glowing Dawn"], playCost: 4 }),
      },
      ask: { selectCards: vi.fn(async () => ["eligible"]) },
      fx: {
        subscribeSubTrigger: vi.fn((sub) => (watcher = sub)),
        trashDigivolutionCards: vi.fn(async () => []),
        useOptionFromHand,
      },
    } as unknown as EffectContext;
    await module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("attack-target-switch-use-option"))!
      .resolve(ctx);

    await watcher!.run(ctx);
    expect(useOptionFromHand).not.toHaveBeenCalled();
    expect(ctx.oncePerTurnActivationDeclined).toBe(true);
  });
});
