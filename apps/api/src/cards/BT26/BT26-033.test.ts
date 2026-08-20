import { EffectTiming, digivolutionRequirementsFor, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, ReplacementInstall } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-033.js";
import "../index.js";

const CARD_ID = "BT26-033";

describe("BT26-033 Jupitermon // Wide Plasment", () => {
  it("uses exactly the Lv.5 [TS] alternate evolution for cost 4 and rejects an off-color non-TS Lv.5", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 5,
      traits: ["TS"],
      cost: 4,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-042", as: "base" }],
        hand: [{ card: CARD_ID, as: "jupiter" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 4;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("jupiter").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(observe(legal.engine).hasKeyword(legal.perm("base"), "Raid")).toBe(true);
    expect(observe(legal.engine).hasKeyword(legal.perm("base"), "Alliance")).toBe(true);
    expect(observe(legal.engine).hasKeyword(legal.perm("base"), "Engage")).toBe(true);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "AD1-004", as: "base" }], hand: [{ card: CARD_ID, as: "jupiter" }] },
    });
    illegal.state.memory = 4;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("jupiter").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("moves top security to hand, then stacks Jupitermon's and Junomon's reductions (Q7004)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "jupiter" }],
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: [{ card: "BT1-009", as: "securityTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    const securityId = s.inst("securityTop").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jupiter"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT25-044"));
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === securityId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("skips the optional Iliad play/use branch on the opponent's turn after moving security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "jupiter" }],
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: [{ card: "BT1-009", as: "top" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jupiter"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("junomon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("pays one stacked card to save all simultaneously leaving own TS cards (Q7005)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, under: [{ card: "BT1-009", as: "cost" }], as: "jupiter" },
            { card: "BT26-042", as: "tsDigimon" },
            { card: "BT26-090", as: "tsTamer" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const costId = s.inst("cost").instanceId;
    await s.ready();
    expect(
      await advance(s.engine).verb.deletePermanent([s.perm("tsDigimon").permanentId, s.perm("tsTamer").permanentId]),
    ).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("tsDigimon").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("tsTamer").permanentId)).toBe(true);
    expect(s.perm("jupiter").stack).toHaveLength(0);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: costId, faceUp: false });
  });

  it("does not prevent leaving when placing the stacked-card cost fails", async () => {
    const cost = { instanceId: "cost", cardId: "COST", ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
    const host = { permanentId: "host", stack: [cost] } as Permanent;
    const target = {
      permanentId: "target",
      controllerSeat: 0 as Seat,
      topCard: { cardId: "TS" },
      inBreeding: false,
    } as Permanent;
    const replacements: ReplacementInstall[] = [];
    const cardSource = { ownerSeat: 0 as Seat, permanent: () => host, isOnBattleArea: () => true } as CardSource;
    const game = {
      permanentById: (id: string) => (id === "host" ? host : target),
      player: () => ({ security: [] }),
      definitionOf: () => ({ types: ["TS"] }),
    } as unknown as GameAccess;
    await module.effectsForTiming(EffectTiming.None, cardSource)[1]!.resolve({
      source: cardSource,
      game,
      fx: {
        subscribeReplacement: (install: ReplacementInstall) => replacements.push(install),
      } as unknown as Primitives,
    } as EffectContext);
    const replacement = replacements[0]!;
    if (replacement.mode !== "prevent") throw new Error("expected prevent replacement");
    expect(replacement.protects!({ game } as EffectContext, target.permanentId)).toBe(true);
    const result = await replacement.preventCheck!(
      {
        game,
        ask: { optional: vi.fn(async () => true) },
        fx: { addSecurity: vi.fn(async () => undefined) },
      } as unknown as EffectContext,
      target.permanentId,
    );
    expect(result).toBe(false);
  });

  it("resolves Wide Plasment by deleting every lowest-DP opponent, then recovering", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "AD1-016", as: "yellowRedSource" }],
        security: ["BT1-009", "BT1-009"],
        deck: [{ card: "BT1-009", as: "recovery" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowA", dp: 2000 },
          { card: "BT1-009", as: "lowB", dp: 2000 },
          { card: "BT1-009", as: "high", dp: 4000 },
        ],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("high").permanentId]);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("computes the always-active use-cost surcharge from the current security count (Q7006)", async () => {
    const changePlayCost = vi.fn();
    const cardSource = { ownerSeat: 0 as Seat } as CardSource;
    const effect = module.effectsForTiming(EffectTiming.None, cardSource)[3]!;
    await effect.resolve({
      source: cardSource,
      game: { player: () => ({ security: [{}, {}, {}] }) },
      fx: { changePlayCost },
    } as unknown as EffectContext);
    expect(changePlayCost).toHaveBeenCalledOnce();
    const [filter, delta] = changePlayCost.mock.calls[0]!;
    expect(delta).toBe(3);
    expect(filter({ def: { cardId: CARD_ID }, controllerSeat: 0 })).toBe(true);
    expect(filter({ def: { cardId: CARD_ID }, controllerSeat: 1 })).toBe(false);
    expect(filter({ def: { cardId: "OTHER" }, controllerSeat: 0 })).toBe(false);
  });

  it("rejects the Option without yellow/red or a TS card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("waives the Option color requirement while the controller has a battle-area TS card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT26-042", as: "greenTs" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
  });
});
