import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-062.js";
import "../index.js";

const CARD_ID = "BT26-062";

describe("BT26-062 Ghostmon", () => {
  it("uses the generated [NSo] level-2 alternate evolution for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-006", as: "base" },
        hand: [{ card: CARD_ID, as: "ghostmon" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ghostmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ghostmon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-006"]);
  });

  it("pays an exact Ghost cost, then draws and gains memory in observable engine state", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "ghostmon" }],
          hand: [
            { card: "BT26-062", as: "cost" },
            { card: "BT5-022", as: "nonmatching" },
          ],
          deck: [{ card: "BT5-022", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nonmatching").instanceId, s.inst("drawn").instanceId]),
    );
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards");
    expect(decision?.req.options?.candidateInstanceIds).toEqual([s.inst("cost").instanceId]);
  });

  it("offers exact Ghost/NSo traits, not near matches, and is an optional By-cost effect", async () => {
    const source = {
      ownerSeat: 0 as Seat,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const hand = [
      { instanceId: "ghost", cardId: "GHOST" },
      { instanceId: "nso", cardId: "NSO" },
      { instanceId: "near", cardId: "NEAR" },
    ];
    const definitions: Record<string, Partial<CardDefinition>> = {
      GHOST: { kinds: [CardKind.Digimon], types: ["Ghost"] },
      NSO: { kinds: [CardKind.Option], types: ["NSo"] },
      NEAR: { kinds: [CardKind.Digimon], types: ["Ghost Beast", "NSO"] },
    };
    const selectCards = vi.fn(async (_ctx, options: { candidates: string[] }) => {
      expect(options.candidates).toEqual(["ghost", "nso"]);
      return [];
    });
    const ctx = {
      source,
      game: {
        player: () => ({ hand }),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: { selectCards },
      fx: {} as Primitives,
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;

    expect(effect.optional).toBe(true);
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
  });

  it("does not draw or gain memory when trashing the selected cost is prevented", async () => {
    const source = {
      ownerSeat: 0 as Seat,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [{ instanceId: "cost", cardId: "GHOST" }] }),
        definitionOf: () => ({ kinds: [CardKind.Digimon], types: ["Ghost"] }),
      },
      ask: { selectCards: vi.fn(async () => ["cost"]) },
      fx: {
        trash: vi.fn(async () => []),
        draw: vi.fn(),
        gainMemory: vi.fn(),
      },
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;

    await effect.resolve(ctx);
    expect(ctx.fx.trash).toHaveBeenCalledWith(["cost"], { byEffectSeat: 0 });
    expect(ctx.fx.draw).not.toHaveBeenCalled();
    expect(ctx.fx.gainMemory).not.toHaveBeenCalled();
  });

  it("grants +2000 DP only from the inherited source and only during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-069", as: "host", under: [CARD_ID] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("top").currentDP).toBe(1000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
