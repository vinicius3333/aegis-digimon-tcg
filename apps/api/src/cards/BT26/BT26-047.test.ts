import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-047.js";

// A3 for BT26-047 (TyrantKabuterimon, BT26): "[On Play] [When Digivolving] This Digimon
// may battle 1 of your opponent's Digimon."
//
// FAILS-WHEN-REVERTED: skipping the `ctx.ask.optional` gate (or the forceBattle call)
// either battles unconditionally or never calls the battle primitive at all; this test
// asserts forceBattle fires with the chosen opponent target only after accepting.

const CARD_ID = "BT26-047";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "tyrantkabuterimon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-047 [On Play]/[When Digivolving]: may battle 1 opponent Digimon", () => {
  it("calls forceBattle against the chosen opponent target only when the player accepts", async () => {
    const oppDigimon = { permanentId: "opp-perm", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, battleArea: [] },
      { seat: 1 as Seat, battleArea: [oppDigimon] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;

    const battles: [string, string][] = [];
    const fx = {
      forceBattle: vi.fn<(...args: any[]) => any>(async (attackerId: string, defenderId: string) => {
        battles.push([attackerId, defenderId]);
      }),
    } as unknown as Primitives;

    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]),
    } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const battleEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-may-battle`);
    expect(battleEffect).toBeDefined();

    await battleEffect!.resolve(ctx);

    expect(battles).toEqual([["self-perm", "opp-perm"]]);
  });

  it("does not battle when the player declines", async () => {
    const oppDigimon = { permanentId: "opp-perm", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, battleArea: [] },
      { seat: 1 as Seat, battleArea: [oppDigimon] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;

    const battles: unknown[] = [];
    const fx = { forceBattle: vi.fn<(...args: any[]) => any>(async () => battles.push(1)) } as unknown as Primitives;
    const ask = { optional: vi.fn<(...args: any[]) => any>(async () => false) } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const module = getEffectModule(CARD_ID);
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const battleEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-may-battle`);

    await battleEffect!.resolve(ctx);

    expect(battles).toEqual([]);
  });
});

describe("BT26-047 suspend-cost clause", () => {
  it("allows the opponent's Digimon to pay the suspend cost (Q7042)", async () => {
    const own = { permanentId: "own-perm", topCard: { cardId: "OWN" }, inBreeding: false, isSuspended: true };
    const opponent = {
      permanentId: "opp-perm",
      topCard: { cardId: "OPP" },
      inBreeding: false,
      isSuspended: false,
    };
    const players = [
      { seat: 0 as Seat, battleArea: [own] },
      { seat: 1 as Seat, battleArea: [opponent] },
    ];
    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [own, opponent].find((p) => p.permanentId === id) as never,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, types: card.cardId === "OPP" ? ["Insectoid"] : [] }),
    } as unknown as GameAccess;
    const suspended: string[][] = [];
    const fx = {
      suspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => suspended.push(ids)),
      restrict: vi.fn<(...args: any[]) => any>(),
      modifyDP: vi.fn<(...args: any[]) => any>(),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      chooseTargets: vi.fn<(...args: any[]) => any>(async () => [opponent.permanentId]),
    } as unknown as EffectContext["ask"];
    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.OnPlay, source)
      .find((candidate) => candidate.effectKey.endsWith("on-play-suspend-buff"))!;

    await effect.resolve(ctx);

    expect(suspended).toEqual([[opponent.permanentId]]);
  });
});
