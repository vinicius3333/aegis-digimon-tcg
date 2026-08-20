import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT26-104.js";

// BT26-104 — Kunlun
//   [Start of Your Main Phase] Gain 1 memory.
//   [On Play] By trashing 1 [Shambala] trait card from your hand, <Draw 2>.
//   [End of Your Turn] If you have a [Tentei Hachibushu] Digimon, by suspending this
//   Tamer, you may use 1 [Shambala] Option from your hand without paying the cost.
//   [Security] Play this card without paying the cost.
//
// FAILS-WHEN-REVERTED: these assertions distinguish Digimon from Tamers, exclude the
// breeding area and near-matching traits, prove that declining pays no cost, and prove
// that the selected Option is used for zero memory while retaining its printed cost.

const CARD_ID = "BT26-104";
const SHAMBALA_DIGIMON = "shambala-digimon";
const SHAMBALA_OPTION = "shambala-option";
const SHAMBALA_TAMER = "shambala-tamer";
const TENTEI_DIGIMON = "tentei-digimon";
const TENTEI_TAMER = "tentei-tamer";
const NEAR_MATCH = "near-match";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function definitionFor(cardId: string): CardDefinition {
  switch (cardId) {
    case SHAMBALA_DIGIMON:
      return fakeDef({ cardId, types: ["Shambala"] });
    case SHAMBALA_OPTION:
      return fakeDef({ cardId, kinds: [CardKind.Option] as never, types: ["Shambala"], playCost: 7 });
    case SHAMBALA_TAMER:
      return fakeDef({ cardId, kinds: [CardKind.Tamer] as never, types: ["Shambala"] });
    case TENTEI_DIGIMON:
      return fakeDef({ cardId, types: ["Tentei Hachibushu"] });
    case TENTEI_TAMER:
      return fakeDef({ cardId, kinds: [CardKind.Tamer] as never, types: ["Tentei Hachibushu"] });
    case NEAR_MATCH:
      return fakeDef({ cardId, kinds: [CardKind.Option] as never, types: ["Shambala Guardian"] });
    default:
      return fakeDef({ cardId, types: ["Machine"] });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "kunlun-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Tamer] as never }),
    permanent: () => ({ permanentId: "kunlun", isSuspended: false }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

interface PermanentFixture {
  permanentId: string;
  topCard?: { instanceId: string; cardId: string };
  inBreeding?: boolean;
}

function makeHarness(options: {
  hand?: { instanceId: string; cardId: string }[];
  battleArea?: PermanentFixture[];
  pick?: (candidates: string[]) => string[];
  source?: CardSource;
} = {}) {
  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], battleArea: options.battleArea ?? [] },
    { seat: 1 as Seat, hand: [], battleArea: [] },
  ];
  const game = {
    player: (seat: Seat) => players[seat],
    opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;
  const calls: string[] = [];
  const fx = {
    gainMemory: vi.fn((amount: number) => calls.push(`memory:${amount}`)),
    trash: vi.fn(async (ids: string[]) => calls.push(`trash:${ids.join(",")}`)),
    draw: vi.fn(async (seat: Seat, count: number) => calls.push(`draw:${seat}:${count}`)),
    suspend: vi.fn(async (ids: string[]) => calls.push(`suspend:${ids.join(",")}`)),
    useOptionFromHand: vi.fn(async (_ctx: EffectContext, id: string, cost?: number) =>
      calls.push(`use:${id}:${cost}`),
    ),
    playFromSecurity: vi.fn(async (id: string, opts: { payCost: boolean }) =>
      calls.push(`security:${id}:${opts.payCost}`),
    ),
  } as unknown as Primitives;
  const offered: string[][] = [];
  const ask = {
    selectCards: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];
  const source = options.source ?? makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { calls, ctx, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((item) => item.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

describe("BT26-104 Kunlun", () => {
  it("gains exactly 1 memory only at the start of its owner's main phase", async () => {
    const own = makeHarness();
    const opponent = makeHarness({ source: makeSource({ isOwnersTurn: () => false }) });
    const effect = effectFor(EffectTiming.OnStartMainPhase, own.source, "start-main-gain-memory");

    expect(effect.canTrigger(own.ctx)).toBe(true);
    expect(effectFor(EffectTiming.OnStartMainPhase, opponent.source, "start-main-gain-memory").canTrigger(opponent.ctx))
      .toBe(false);
    await effect.resolve(own.ctx);
    expect(own.calls).toEqual(["memory:1"]);
  });

  it("trashes only the chosen exact-trait card before drawing 2", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "digimon", cardId: SHAMBALA_DIGIMON },
        { instanceId: "tamer", cardId: SHAMBALA_TAMER },
        { instanceId: "near", cardId: NEAR_MATCH },
      ],
      pick: (candidates) => [candidates[1]!],
    });
    const effect = effectFor(EffectTiming.OnPlay, harness.source, "on-play-trash-shambala-draw-2");

    expect(effect.canActivate(harness.ctx)).toBe(true);
    await effect.resolve(harness.ctx);
    expect(harness.offered).toEqual([["digimon", "tamer"]]);
    expect(harness.calls).toEqual(["trash:tamer", "draw:0:2"]);
  });

  it("draws nothing when the optional On Play cost is declined", async () => {
    const harness = makeHarness({
      hand: [{ instanceId: "digimon", cardId: SHAMBALA_DIGIMON }],
      pick: () => [],
    });
    await effectFor(EffectTiming.OnPlay, harness.source, "on-play-trash-shambala-draw-2").resolve(harness.ctx);
    expect(harness.calls).toEqual([]);
  });

  it("suspends Kunlun, then uses an exact-trait Option for free with its printed cost metadata", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "valid-option", cardId: SHAMBALA_OPTION },
        { instanceId: "wrong-kind", cardId: SHAMBALA_DIGIMON },
        { instanceId: "near", cardId: NEAR_MATCH },
      ],
      battleArea: [
        { permanentId: "tentei", topCard: { instanceId: "tentei-top", cardId: TENTEI_DIGIMON } },
      ],
    });
    const effect = effectFor(EffectTiming.OnEndTurn, harness.source, "end-turn-suspend-use-shambala-option");

    expect(effect.canActivate(harness.ctx)).toBe(true);
    await effect.resolve(harness.ctx);
    expect(harness.offered).toEqual([["valid-option"]]);
    expect(harness.calls).toEqual(["suspend:kunlun", "use:valid-option:7"]);
    expect(harness.calls.some((call) => call.startsWith("memory:"))).toBe(false);
  });

  it("does not accept a Tamer, breeding Digimon, or near-match for the Tentei condition", () => {
    for (const battleArea of [
      [{ permanentId: "tamer", topCard: { instanceId: "tamer-top", cardId: TENTEI_TAMER } }],
      [{ permanentId: "breeding", topCard: { instanceId: "egg-top", cardId: TENTEI_DIGIMON }, inBreeding: true }],
      [{ permanentId: "near", topCard: { instanceId: "near-top", cardId: NEAR_MATCH } }],
    ]) {
      const harness = makeHarness({
        hand: [{ instanceId: "valid-option", cardId: SHAMBALA_OPTION }],
        battleArea,
      });
      expect(
        effectFor(EffectTiming.OnEndTurn, harness.source, "end-turn-suspend-use-shambala-option").canActivate(
          harness.ctx,
        ),
      ).toBe(false);
    }
  });

  it("does not suspend Kunlun when the optional Option use is declined", async () => {
    const harness = makeHarness({
      hand: [{ instanceId: "valid-option", cardId: SHAMBALA_OPTION }],
      battleArea: [
        { permanentId: "tentei", topCard: { instanceId: "tentei-top", cardId: TENTEI_DIGIMON } },
      ],
      pick: () => [],
    });
    await effectFor(EffectTiming.OnEndTurn, harness.source, "end-turn-suspend-use-shambala-option").resolve(
      harness.ctx,
    );
    expect(harness.calls).toEqual([]);
  });

  it("plays itself from security without paying the cost", async () => {
    const harness = makeHarness();
    await effectFor(EffectTiming.SecuritySkill, harness.source, "security-play-free").resolve(harness.ctx);
    expect(harness.calls).toEqual(["security:kunlun-top:false"]);
  });
});
