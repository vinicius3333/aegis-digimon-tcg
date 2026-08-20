import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-026.js";
import "../index.js";

describe("BT26-026 Cougarmon", () => {
  it("uses the exact level-3 Glowing Dawn alternate evolution for cost 2", async () => {
    expect(digivolutionRequirementsFor("BT26-026")).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-052", as: "offColorBase" }],
        hand: [{ card: "BT26-026", as: "cougarmon" }],
        deck: ["AD1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("offColorBase").permanentId,
        instanceId: legal.inst("cougarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("offColorBase").topCard.cardId === "BT26-026");
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "wrongTrait" }],
        hand: [{ card: "BT26-026", as: "cougarmon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongTrait").permanentId,
        instanceId: illegal.inst("cougarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("exposes Barrier both as the top card and as an inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-026", as: "top" },
          { card: "BT1-060", as: "host", under: ["BT26-026"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("pays with a Tamer's actual bottom face-down card and uses the Option for 2 less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-026", as: "cougarmon" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [
            { card: "P-236", as: "option" },
            { card: "BT1-001", as: "material" },
          ],
        },
        1: { security: ["AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await advance(s.engine).verb.placeUnder(s.perm("tamer").permanentId, [s.inst("material").instanceId]);
    preferred.push(s.inst("option").instanceId);
    const materialId = s.inst("material").instanceId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cougarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === materialId));
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "P-236"));
  });

  it("requires the actual bottom Tamer card to be face-down and chooses the Option before paying", async () => {
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { cardId: "TAMER" },
      stack: [
        { instanceId: "bottom", faceUp: false },
        { instanceId: "upper", faceUp: false },
      ],
    };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "cougarmon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const calls: string[] = [];
    const chosenOption = { instanceId: "option", cardId: "OPTION" };
    const ctx = {
      source,
      trigger: { attackerPermanentId: "cougarmon" },
      game: {
        player: () => ({ hand: [chosenOption], battleArea: [tamer], security: [] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? { kinds: [CardKind.Tamer] }
            : { kinds: [CardKind.Option], types: ["Glowing Dawn"], playCost: 3 },
      },
      ask: {
        selectCards: vi.fn<(...args: any[]) => any>(async () => {
          calls.push("selectOption");
          return [chosenOption.instanceId];
        }),
        optional: vi.fn<(...args: any[]) => any>(async () => {
          calls.push("payCost");
          return true;
        }),
      },
      fx: {
        trashDigivolutionCards: vi.fn<(...args: any[]) => any>(async () => [{ instanceId: "bottom" }]),
        gainMemory: vi.fn<(...args: any[]) => any>(),
        useOptionFromHand: vi.fn<(...args: any[]) => any>(async () => []),
      },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(calls).toEqual(["selectOption", "payCost"]);
    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["bottom"]);
    expect(ctx.fx.gainMemory).toHaveBeenCalledWith(-1);
    expect(ctx.fx.useOptionFromHand).toHaveBeenCalledWith(ctx, "option", 3);

    tamer.stack[0]!.faceUp = true;
    expect(effect.canActivate(ctx)).toBe(false);
  });

  it("releases the Once Per Turn budget when the controller declines the Option choice", async () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "cougarmon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const option = { instanceId: "option", cardId: "OPTION" };
    const ctx = {
      source,
      trigger: { attackerPermanentId: "cougarmon" },
      game: {
        player: () => ({ hand: [option], battleArea: [], security: [{ instanceId: "security" }] }),
        definitionOf: () => ({ kinds: [CardKind.Option], types: ["Glowing Dawn"], playCost: 3 }),
      },
      ask: { selectCards: vi.fn(async () => []) },
      fx: {},
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!.resolve(ctx);

    expect(ctx.oncePerTurnActivationDeclined).toBe(true);
  });
});
