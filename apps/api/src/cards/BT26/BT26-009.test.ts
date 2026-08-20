import { describe, expect, it, vi } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, type CardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT26-009.js";
import "../index.js";

const definition = (overrides: Partial<CardDefinition>): CardDefinition =>
  ({
    cardId: "TEST-001",
    set: "TEST",
    nameEn: "Test",
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...overrides,
  }) as CardDefinition;

describe("BT26-009 Hyokomon", () => {
  it("uses the exact off-color Lv.2 [TS] cost-0 evolution path and rejects a near-match", () => {
    expect(digivolutionRequirementsFor("BT26-009")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "tsEgg" },
        hand: [{ card: "BT26-009", as: "hyokomon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("hyokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "plainEgg" },
        hand: [{ card: "BT26-009", as: "hyokomon" }],
      },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainEgg").permanentId,
        instanceId: illegal.inst("hyokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("pays the start-main hand-trash cost, then draws and gains 1 memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-009", as: "hyokomon" }],
          hand: [
            { card: "BT26-016", as: "chronomon" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chronomon").instanceId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hyokomon"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("chronomon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("unrelated").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("inherited attack draws first, then at exactly 6 returns one hand card face-down to deck bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-009" }] }],
          hand: [{ card: "BT1-009", as: "bottom" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bottom").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.deck.at(-1)?.faceUp).toBe(false);
  });

  it("inherited attack stops after drawing when the post-draw hand has only 5 cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-014", as: "host", under: [{ card: "BT26-009" }] },
          { card: "BT1-009", as: "ally" },
        ],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        deck: [{ card: "BT1-005", as: "drawn" }],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("recognizes Chronomon in inherited text for its start-of-main cost (Q6963)", async () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "hyokomon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    const inheritedMatch = { instanceId: "inherited-match", cardId: "TEST-002" };
    const unrelated = { instanceId: "unrelated", cardId: "TEST-003" };
    const selectCards = vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [
      opts.candidates[0]!,
    ]);
    const trash = vi.fn<(...args: any[]) => any>(async () => [inheritedMatch]);
    const draw = vi.fn<(...args: any[]) => any>(async () => undefined);
    const gainMemory = vi.fn<(...args: any[]) => any>();
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [inheritedMatch, unrelated] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === inheritedMatch.cardId
            ? definition({ cardId: card.cardId, inheritedEffectText: "[When Attacking] If [Chronomon]..." })
            : definition({ cardId: card.cardId }),
      },
      ask: { selectCards },
      fx: { trash, draw, gainMemory },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;
    await effect.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(ctx, {
      candidates: [inheritedMatch.instanceId],
      min: 0,
      max: 1,
    });
    expect(trash).toHaveBeenCalledWith([inheritedMatch.instanceId]);
    expect(draw).toHaveBeenCalledWith(0, 1);
    expect(gainMemory).toHaveBeenCalledWith(1);
  });

  it("grants neither draw nor memory when the selected trash cost does not actually move", async () => {
    const source = { ownerSeat: 0, isOnBattleArea: () => true, isOwnersTurn: () => true } as unknown as CardSource;
    const candidate = { instanceId: "candidate", cardId: "SHAMAN" };
    const draw = vi.fn();
    const gainMemory = vi.fn();
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [candidate] }),
        definitionOf: () => definition({ cardId: "SHAMAN", types: ["Shaman"] }),
      },
      ask: { selectCards: vi.fn(async () => [candidate.instanceId]) },
      fx: { trash: vi.fn(async () => []), draw, gainMemory },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!.resolve(ctx);

    expect(draw).not.toHaveBeenCalled();
    expect(gainMemory).not.toHaveBeenCalled();
  });
});
