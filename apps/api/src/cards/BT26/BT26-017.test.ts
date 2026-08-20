import {
  EffectDuration,
  EffectTiming,
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-017.js";
import "../index.js";

const CARD_ID = "BT26-017";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "BT26",
    nameEn: "Test",
    kinds: ["Digimon"] as never,
    colors: [] as never,
    playCost: 0,
    dp: 0,
    types: [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(): CardSource {
  return {
    instanceId: "zanbamon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, types: ["Shambala", "TS"] }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-017 Zanbamon", () => {
  it("exposes the exact alternate evolution and Assembly -4 recipe", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 5,
      traits: ["Shambala", "TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      { reduceCost: 4, materials: [{ traits: ["Shambala"], levelMax: 5, count: 2, differentLevels: true }] },
    ]);
  });

  it("digivolves for 3 on an off-color Lv.5 Shambala and rejects an off-color non-trait Lv.5", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX12-029", as: "base" }],
        hand: [{ card: CARD_ID, as: "zanbamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("zanbamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "AD1-015", as: "plain" }], hand: [{ card: CARD_ID, as: "zanbamon" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plain").permanentId,
        instanceId: illegal.inst("zanbamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.state.memory).toBe(3);
  });

  it("assembles different-level Shambala cards, pays 8, preserves order, and resolves every keyword", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "zanbamon" }],
          trash: [
            { card: "BT26-008", as: "level3" },
            { card: "BT26-012", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    const materials = [s.inst("level3").instanceId, s.inst("level4").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("zanbamon").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID));
    const zanbamon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === CARD_ID)!;
    await settle(() => observe(s.engine).hasKeyword(zanbamon, "Progress"));
    expect(s.state.memory).toBe(0);
    expect(zanbamon.stack.map((card) => card.instanceId)).toEqual([...materials].reverse());
    expect(observe(s.engine).hasKeyword(zanbamon, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(zanbamon, "Retaliation")).toBe(true);
    expect(observe(s.engine).keywordAmount(zanbamon, "SecurityAttack")).toBe(1);
  });

  it("rejects Assembly with repeated levels without moving cards or paying memory", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "zanbamon" }],
        trash: [
          { card: "BT26-012", as: "a" },
          { card: "BT26-013", as: "b" },
        ],
      },
    });
    s.state.memory = 8;
    const materials = [s.inst("a").instanceId, s.inst("b").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("zanbamon").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(materials);
  });

  it("on deletion plays an eligible Shambala card from trash for free", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "zanbamon" }], trash: [{ card: "BT26-012", as: "candidate" }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    const candidate = s.inst("candidate").instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("zanbamon").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === candidate));
    expect(s.state.memory).toBe(0);
  });

  it("allows either trait and any card kind at cost 5, permits declining, and excludes near misses", async () => {
    const trash = [
      { instanceId: "shambala", cardId: "SHAMBALA" },
      { instanceId: "tamer", cardId: "TAMER" },
      { instanceId: "six", cardId: "SIX" },
      { instanceId: "near", cardId: "NEAR" },
    ] as CardInstance[];
    const defs: Record<string, CardDefinition> = {
      SHAMBALA: fakeDef({ cardId: "SHAMBALA", playCost: 5, types: ["Shambala"] }),
      TAMER: fakeDef({ cardId: "TAMER", kinds: ["Tamer"] as never, playCost: 3, types: ["TS"] }),
      SIX: fakeDef({ cardId: "SIX", playCost: 6, types: ["Shambala"] }),
      NEAR: fakeDef({ cardId: "NEAR", playCost: 5, types: ["TSystem"] }),
    };
    const selectCards = vi.fn(async (_ctx, options: { candidates: string[]; min: number; max: number }) => {
      expect(options).toEqual({ candidates: ["shambala", "tamer"], min: 0, max: 1 });
      return [];
    });
    const playInstances = vi.fn();
    const cardSource = source();
    await module
      .effectsForTiming(EffectTiming.OnDestroyedAnyone, cardSource)[0]!
      .resolve({
        source: cardSource,
        trigger: {},
        game: {
          player: () => ({ trash }),
          definitionOf: (card: CardInstance) => defs[card.cardId]!,
        } as unknown as GameAccess,
        ask: { selectCards },
        fx: { playInstances } as unknown as Primitives,
      } as unknown as EffectContext);
    expect(selectCards).toHaveBeenCalledOnce();
    expect(playInstances).not.toHaveBeenCalled();
  });

  it("keeps innate keywords permanent while evolution grants last only for the turn", async () => {
    const grants: Array<[string, string, EffectDuration, number | undefined]> = [];
    const self = { permanentId: "self", topCard: { cardId: CARD_ID }, inBreeding: false };
    const cardSource = { ...source(), permanent: () => self } as CardSource;
    const ctx = {
      source: cardSource,
      trigger: {},
      game: {
        player: () => ({ battleArea: [self] }),
        definitionOf: () => fakeDef({ cardId: CARD_ID, types: ["Shambala"] }),
      } as unknown as GameAccess,
      fx: {
        grantKeyword: vi.fn((id: string, keyword: string, duration: EffectDuration, amount?: number) =>
          grants.push([id, keyword, duration, amount]),
        ),
      } as unknown as Primitives,
      ask: {},
    } as unknown as EffectContext;
    for (const effect of module.effectsForTiming(EffectTiming.None, cardSource)) await effect.resolve(ctx);
    await module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve(ctx);
    expect(grants).toEqual([
      ["self", "Blocker", EffectDuration.Permanent, undefined],
      ["self", "Retaliation", EffectDuration.Permanent, undefined],
      ["self", "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1],
      ["self", "Progress", EffectDuration.UntilEachTurnEnd, undefined],
    ]);
  });
});
