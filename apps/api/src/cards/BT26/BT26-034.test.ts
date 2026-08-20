import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-034.js";
import "../index.js";

const CARD_ID = "BT26-034";

function source(): CardSource {
  return {
    instanceId: "palmon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "palmon-permanent", topCard: { cardId: CARD_ID } }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-034 Palmon", () => {
  it("uses the exact off-color Lv.2 TS alternate evolution for cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-001", as: "redTsEgg" }],
        hand: [{ card: CARD_ID, as: "palmon" }],
        deck: ["BT5-022"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTsEgg").permanentId,
        instanceId: s.inst("palmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redTsEgg").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("Q7007: at exactly 4 memory, freely evolves into a legal Vegetation card at Start Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "palmon" }],
          hand: [{ card: "BT26-039", as: "togemon" }],
          deck: ["BT5-022"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));
    await settle(() => s.perm("palmon").topCard.cardId === "BT26-039");
    expect(s.state.memory).toBe(4);
    expect(s.perm("palmon").stack.some((card) => card.cardId === CARD_ID)).toBe(true);
  });

  it("does not activate above 4 memory or offer a trait match that cannot legally evolve onto Palmon", () => {
    const cardSource = source();
    const legal = { instanceId: "legal", cardId: "LEGAL" };
    const illegal = { instanceId: "illegal", cardId: "ILLEGAL" };
    const ctx = {
      source: cardSource,
      game: {
        state: { memory: 5, turnSeat: 0 as Seat },
        player: () => ({ hand: [legal, illegal] }),
        definitionOf: (card: { cardId: string }) => {
          if (card.cardId === CARD_ID) {
            return {
              kinds: [CardKind.Digimon],
              nameEn: "Palmon",
              colors: ["Green"],
              level: 3,
              types: ["Vegetation"],
            };
          }
          if (card.cardId === "LEGAL") {
            return {
              cardId: "LEGAL",
              kinds: [CardKind.Digimon],
              nameEn: "Legalmon",
              colors: ["Green"],
              level: 4,
              types: ["Vegetation"],
              evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
            };
          }
          return {
            cardId: "ILLEGAL",
            kinds: [CardKind.Digimon],
            nameEn: "Illegalmon",
            colors: ["Blue"],
            level: 6,
            types: ["TS"],
            evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
          };
        },
      } as unknown as GameAccess,
    } as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnStartMainPhase, cardSource)[0]!;
    expect(effect.canActivate?.(ctx)).toBe(false);
    (ctx.game.state as { memory: number }).memory = 4;
    expect(effect.canActivate?.(ctx)).toBe(true);
  });

  it("requires exactly one card after accepting the optional Start Main effect", async () => {
    const cardSource = source();
    const ctx = {
      source: cardSource,
      game: {
        state: { memory: 4, turnSeat: 0 as Seat },
        player: () => ({ hand: [{ instanceId: "legal", cardId: "LEGAL" }] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === CARD_ID
            ? ({ kinds: [CardKind.Digimon], nameEn: "Palmon", colors: ["Green"], level: 3 } as CardDefinition)
            : ({
                kinds: [CardKind.Digimon],
                nameEn: "Legalmon",
                colors: ["Green"],
                level: 4,
                types: ["Vegetation"],
                evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
              } as CardDefinition),
      } as unknown as GameAccess,
      ask: {
        selectCards: vi.fn(async (_ctx, options: { min: number; max: number }) => {
          expect(options).toMatchObject({ min: 1, max: 1 });
          return ["legal"];
        }),
      },
      fx: { digivolveFromInstance: vi.fn(async () => true) },
    } as unknown as EffectContext;
    await module.effectsForTiming(EffectTiming.OnStartMainPhase, cardSource)[0]!.resolve(ctx);
    expect(ctx.fx.digivolveFromInstance).toHaveBeenCalledWith("palmon-permanent", "legal", { payCost: false });
  });

  it("inherits a self-attack OPT that only offers unsuspended opposing Digimon", async () => {
    const cardSource = source();
    const candidates = [
      { permanentId: "valid", topCard: { cardId: "DIGIMON" }, isSuspended: false, inBreeding: false },
      { permanentId: "suspended", topCard: { cardId: "DIGIMON" }, isSuspended: true, inBreeding: false },
      { permanentId: "tamer", topCard: { cardId: "TAMER" }, isSuspended: false, inBreeding: false },
      { permanentId: "breeding", topCard: { cardId: "DIGIMON" }, isSuspended: false, inBreeding: true },
    ];
    const suspend = vi.fn(async () => ["valid"]);
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({ battleArea: candidates }),
        definitionOf: (card: { cardId: string }) => ({
          kinds: [card.cardId === "TAMER" ? CardKind.Tamer : CardKind.Digimon],
        }),
      } as unknown as GameAccess,
      ask: {
        chooseTargets: vi.fn(async (_ctx, options: { candidates: string[]; min: number }) => {
          expect(options).toMatchObject({ candidates: ["valid"], min: 1 });
          return ["valid"];
        }),
      },
      fx: { suspend },
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnUseAttack, cardSource)[0]!;
    expect(effect).toMatchObject({ isInherited: true, maxPerTurn: 1, optional: true });
    await effect.resolve(ctx);
    expect(suspend).toHaveBeenCalledWith(["valid"]);
  });
});
