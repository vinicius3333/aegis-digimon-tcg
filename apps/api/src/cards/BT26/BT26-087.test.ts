import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-087.js";

// BT26-087 (Toya Kuga, BT26 Tamer):
//   "[Start of Your Main Phase] By returning 1 [TS] trait Digimon card from your trash to the
//    bottom of the deck, gain 1 memory. After, you may return 1 [Giant Slayer] from your trash
//    to the hand."
//   "[On Play] By trashing 1 [TS] card from your hand, <Draw 2>"
//
// FAILS-WHEN-REVERTED: gaining memory before the cost resolves (or on a decline) hands out
// free memory; dropping the Digimon-kind filter accepts a [TS] Tamer as the cost; running the
// [Giant Slayer] recovery when the cost was declined skips the printed "By ..."; returning to
// the deck TOP instead of the bottom is asserted.

const CARD_ID = "BT26-087";

const TS_DIGIMON = "ts-digimon";
const TS_TAMER = "ts-tamer";
const GIANT_SLAYER = "giant-slayer";
const PLAIN = "plain";

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
    case TS_DIGIMON:
      return fakeDef({ cardId, nameEn: "Chronomon", types: ["TS"] });
    case TS_TAMER:
      return fakeDef({ cardId, nameEn: "Some Tamer", kinds: [CardKind.Tamer] as never, types: ["TS"] });
    case GIANT_SLAYER:
      return fakeDef({ cardId, nameEn: "Giant Slayer", types: ["TS"] });
    default:
      return fakeDef({ cardId, nameEn: "Filler", types: ["Machine"] });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "toya-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Tamer] as never }),
    permanent: () => ({ permanentId: "toya" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  hand?: { instanceId: string; cardId: string }[];
  trash?: { instanceId: string; cardId: string }[];
  pick?: (candidates: string[], round: number) => string[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], trash: options.trash ?? [], battleArea: [] },
    { seat: 1 as Seat, hand: [], trash: [], battleArea: [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const fx = {
    returnToDeck: vi.fn<(...args: any[]) => any>(async (ids: string[], opts?: { toTop?: boolean }) => {
      calls.push(`returnToDeck:${ids.join(",")}:${opts?.toTop === true}`);
      return [];
    }),
    returnToHand: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`returnToHand:${ids.join(",")}`);
      return [];
    }),
    trash: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`trash:${ids.join(",")}`);
      return [];
    }),
    draw: vi.fn<(...args: any[]) => any>(async (seat: Seat, n: number) => {
      calls.push(`draw:${seat}:${n}`);
      return [];
    }),
    gainMemory: vi.fn<(...args: any[]) => any>((n: number) => {
      calls.push(`gainMemory:${n}`);
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates, offered.length) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, calls, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const MAIN_KEY = "start-main-return-ts-gain-memory";
const ON_PLAY_KEY = "on-play-trash-ts-draw-2";

describe("BT26-087 [Start of Your Main Phase]: recycle a [TS] Digimon for memory", () => {
  it("returns the cost card to the deck bottom, gains 1 memory, then recovers Giant Slayer", async () => {
    const harness = makeHarness({
      trash: [
        { instanceId: "trash-ts", cardId: TS_DIGIMON },
        { instanceId: "trash-gs", cardId: GIANT_SLAYER },
      ],
    });

    await effectFor(EffectTiming.OnStartMainPhase, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["returnToDeck:trash-ts:false", "gainMemory:1", "returnToHand:trash-gs"]);
  });

  it("offers only [TS] trait Digimon cards from trash as the cost", async () => {
    const harness = makeHarness({
      trash: [
        { instanceId: "trash-ts", cardId: TS_DIGIMON },
        { instanceId: "trash-gs", cardId: GIANT_SLAYER },
        { instanceId: "trash-ts-tamer", cardId: TS_TAMER },
        { instanceId: "trash-plain", cardId: PLAIN },
      ],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnStartMainPhase, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["trash-ts", "trash-gs"]]);
    expect(harness.calls).toEqual([]);
  });

  it("gains nothing when the cost is declined", async () => {
    const harness = makeHarness({ trash: [{ instanceId: "trash-ts", cardId: TS_DIGIMON }], pick: () => [] });

    await effectFor(EffectTiming.OnStartMainPhase, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([]);
  });

  it("skips the Giant Slayer recovery when none is in trash or the player declines it", async () => {
    const noCopy = makeHarness({ trash: [{ instanceId: "trash-ts", cardId: TS_DIGIMON }] });
    await effectFor(EffectTiming.OnStartMainPhase, noCopy.source, MAIN_KEY).resolve(noCopy.ctx);
    expect(noCopy.calls).toEqual(["returnToDeck:trash-ts:false", "gainMemory:1"]);

    const declined = makeHarness({
      trash: [
        { instanceId: "trash-ts", cardId: TS_DIGIMON },
        { instanceId: "trash-gs", cardId: GIANT_SLAYER },
      ],
      pick: (candidates, round) => (round === 1 ? [candidates[0]!] : []),
    });
    await effectFor(EffectTiming.OnStartMainPhase, declined.source, MAIN_KEY).resolve(declined.ctx);
    expect(declined.calls).toEqual(["returnToDeck:trash-ts:false", "gainMemory:1"]);
  });

  it("fires only on its controller's own main phase and cannot activate with an empty trash", () => {
    const offTurn = makeHarness({ source: makeSource({ isOwnersTurn: () => false }) });
    const empty = makeHarness({});

    expect(effectFor(EffectTiming.OnStartMainPhase, offTurn.source, MAIN_KEY).canTrigger(offTurn.ctx)).toBe(false);
    expect(effectFor(EffectTiming.OnStartMainPhase, empty.source, MAIN_KEY).canActivate(empty.ctx)).toBe(false);
  });
});

describe("BT26-087 [On Play]: trash a [TS] card to draw 2", () => {
  it("trashes the chosen [TS] card then draws two", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-ts", cardId: TS_DIGIMON },
        { instanceId: "hand-plain", cardId: PLAIN },
      ],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["hand-ts"]]);
    expect(harness.calls).toEqual(["trash:hand-ts", "draw:0:2"]);
  });

  it("accepts any [TS] card kind from hand, Tamers included", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-ts-tamer", cardId: TS_TAMER },
        { instanceId: "hand-plain", cardId: PLAIN },
      ],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["trash:hand-ts-tamer", "draw:0:2"]);
  });

  it("draws nothing when the cost is declined or unavailable", async () => {
    const declined = makeHarness({ hand: [{ instanceId: "hand-ts", cardId: TS_DIGIMON }], pick: () => [] });
    await effectFor(EffectTiming.OnPlay, declined.source, ON_PLAY_KEY).resolve(declined.ctx);
    expect(declined.calls).toEqual([]);

    const empty = makeHarness({ hand: [{ instanceId: "hand-plain", cardId: PLAIN }] });
    expect(effectFor(EffectTiming.OnPlay, empty.source, ON_PLAY_KEY).canActivate(empty.ctx)).toBe(false);
  });
});
