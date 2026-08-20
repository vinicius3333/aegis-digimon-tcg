import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-088.js";

// BT26-088 (Hiroko Sagisaka, BT26 Tamer):
//   "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory."
//
// The [Your Turn] play-cost reduction is an engine-blocked residual (see the module header):
// nothing consults the `wouldBePlayed` replacement event at play-cost time. This suite pins
// that the module exposes NO effect for it, so the omission stays deliberate and visible.
//
// FAILS-WHEN-REVERTED: dropping the opponent-Digimon condition gains memory on an empty board;
// dropping the own-turn gate fires on the opponent's main phase; counting a breeding-area
// Digimon or a Tamer as "a Digimon" satisfies the condition wrongly.

const CARD_ID = "BT26-088";
const MEMORY_KEY = "start-main-gain-memory";

const DIGIMON = "digimon";
const TAMER = "tamer";

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

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "hiroko-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Tamer] as never }),
    permanent: () => ({ permanentId: "hiroko" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  theirs?: { permanentId: string; topCard?: { cardId: string }; inBreeding?: boolean }[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, battleArea: [] },
    { seat: 1 as Seat, battleArea: options.theirs ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) =>
      fakeDef({ kinds: (card.cardId === TAMER ? [CardKind.Tamer] : [CardKind.Digimon]) as never }),
  } as unknown as GameAccess;

  const memory: number[] = [];
  const fx = { gainMemory: vi.fn<(...args: any[]) => any>((n: number) => memory.push(n)) } as unknown as Primitives;

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;
  return { ctx, memory, source };
}

function memoryEffect(source: CardSource) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!
    .effectsForTiming(EffectTiming.OnStartMainPhase, source)
    .find((e) => e.effectKey === `${CARD_ID}/${MEMORY_KEY}`);
  expect(effect).toBeDefined();
  return effect!;
}

describe("BT26-088 [Start of Your Main Phase]: gain 1 memory while the opponent has a Digimon", () => {
  it("gains 1 memory when the opponent controls a Digimon", async () => {
    const harness = makeHarness({ theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }] });
    const effect = memoryEffect(harness.source);

    expect(effect.canTrigger(harness.ctx)).toBe(true);
    await effect.resolve(harness.ctx);

    expect(harness.memory).toEqual([1]);
  });

  it("does not trigger when the opponent has only Tamers or breeding-area Digimon", () => {
    const tamersOnly = makeHarness({ theirs: [{ permanentId: "opp-tamer", topCard: { cardId: TAMER } }] });
    const breedingOnly = makeHarness({
      theirs: [{ permanentId: "opp-egg", topCard: { cardId: DIGIMON }, inBreeding: true }],
    });
    const empty = makeHarness({});

    expect(memoryEffect(tamersOnly.source).canTrigger(tamersOnly.ctx)).toBe(false);
    expect(memoryEffect(breedingOnly.source).canTrigger(breedingOnly.ctx)).toBe(false);
    expect(memoryEffect(empty.source).canTrigger(empty.ctx)).toBe(false);
  });

  it("gains nothing if the opponent's last Digimon left before the effect resolved", async () => {
    const harness = makeHarness({});
    await memoryEffect(harness.source).resolve(harness.ctx);

    expect(harness.memory).toEqual([]);
  });

  it("does not trigger on the opponent's main phase or from off the battle area", () => {
    const offTurn = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }],
      source: makeSource({ isOwnersTurn: () => false }),
    });
    const offField = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }],
      source: makeSource({ isOnBattleArea: () => false }),
    });

    expect(memoryEffect(offTurn.source).canTrigger(offTurn.ctx)).toBe(false);
    expect(memoryEffect(offField.source).canTrigger(offField.ctx)).toBe(false);
  });

  it("exposes no effect for the engine-blocked play-cost reduction", () => {
    const module = getEffectModule(CARD_ID)!;
    const source = makeSource();

    expect(module.effectsForTiming(EffectTiming.None, source)).toEqual([]);
    expect(module.effectsForTiming(EffectTiming.BeforePayCost, source)).toEqual([]);
  });
});
