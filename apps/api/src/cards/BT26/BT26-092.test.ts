import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-092.js";

// BT26-092 (Shota Kuroi, BT26 Tamer):
//   "[Start of Your Main Phase] By trashing 1 [TS] trait card from your hand, <Draw 1> and gain
//    1 memory."
//   "[Opponent's Turn] When one of your opponent's Digimon attacks, by returning 1 of your [TS]
//    trait Tamers to the bottom of the deck, you may change the attack target to 1 of your
//    Digimon with the [TS] trait."
//
// FAILS-WHEN-REVERTED: drawing or gaining memory before the cost resolves (or on a decline)
// hands out a free benefit; offering a [TS] Digimon as the return cost breaks the printed
// "Tamers"; redirecting to a non-[TS] Digimon widens the target set; returning to the deck TOP
// instead of the bottom is asserted.

const CARD_ID = "BT26-092";

const TS_DIGIMON = "ts-digimon";
const TS_TAMER = "ts-tamer";
const PLAIN_DIGIMON = "plain-digimon";
const PLAIN_TAMER = "plain-tamer";

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
      return fakeDef({ cardId, types: ["TS"] });
    case TS_TAMER:
      return fakeDef({ cardId, kinds: [CardKind.Tamer] as never, types: ["TS"] });
    case PLAIN_TAMER:
      return fakeDef({ cardId, kinds: [CardKind.Tamer] as never, types: ["Xros Heart"] });
    default:
      return fakeDef({ cardId, types: ["Machine"] });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "shota-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Tamer] as never }),
    permanent: () => ({ permanentId: "shota" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => false,
    hasColor: () => false,
    ...over,
  };
}

interface Perm {
  permanentId: string;
  topCard?: { instanceId: string; cardId: string };
  inBreeding?: boolean;
}

function makeHarness(options: {
  hand?: { instanceId: string; cardId: string }[];
  mine?: Perm[];
  pick?: (candidates: string[]) => string[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], battleArea: options.mine ?? [] },
    { seat: 1 as Seat, hand: [], battleArea: [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const fx = {
    trash: vi.fn(async (ids: string[]) => {
      calls.push(`trash:${ids.join(",")}`);
      return [];
    }),
    draw: vi.fn(async (seat: Seat, n: number) => {
      calls.push(`draw:${seat}:${n}`);
      return [];
    }),
    gainMemory: vi.fn((n: number) => calls.push(`gainMemory:${n}`)),
    returnToDeck: vi.fn(async (ids: string[], opts?: { toTop?: boolean }) => {
      calls.push(`returnToDeck:${ids.join(",")}:${opts?.toTop === true}`);
      return [];
    }),
    redirectAttack: vi.fn(async (ids: string[], opts?: { optional?: boolean }) => {
      calls.push(`redirectAttack:${ids.join(",")}:${opts?.optional === true}`);
    }),
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
  return { ctx, calls, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const MAIN_KEY = "start-main-trash-ts-draw-memory";
const REDIRECT_KEY = "opponent-attack-redirect-to-ts-digimon";

describe("BT26-092 [Start of Your Main Phase]: trash a [TS] card to draw and gain memory", () => {
  const ownTurn = () => makeSource({ isOwnersTurn: () => true });

  it("trashes the chosen [TS] card, then draws 1 and gains 1 memory", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-ts", cardId: TS_DIGIMON },
        { instanceId: "hand-plain", cardId: PLAIN_DIGIMON },
      ],
      source: ownTurn(),
    });

    await effectFor(EffectTiming.OnStartMainPhase, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["hand-ts"]]);
    expect(harness.calls).toEqual(["trash:hand-ts", "draw:0:1", "gainMemory:1"]);
  });

  it("does nothing when the cost is declined", async () => {
    const harness = makeHarness({
      hand: [{ instanceId: "hand-ts", cardId: TS_DIGIMON }],
      pick: () => [],
      source: ownTurn(),
    });

    await effectFor(EffectTiming.OnStartMainPhase, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([]);
  });

  it("only triggers on its controller's main phase and needs a [TS] card in hand", () => {
    const own = makeHarness({ hand: [{ instanceId: "hand-ts", cardId: TS_DIGIMON }], source: ownTurn() });
    const opponentTurn = makeHarness({ hand: [{ instanceId: "hand-ts", cardId: TS_DIGIMON }] });
    const noTs = makeHarness({ hand: [{ instanceId: "hand-plain", cardId: PLAIN_DIGIMON }], source: ownTurn() });

    expect(effectFor(EffectTiming.OnStartMainPhase, own.source, MAIN_KEY).canTrigger(own.ctx)).toBe(true);
    expect(effectFor(EffectTiming.OnStartMainPhase, opponentTurn.source, MAIN_KEY).canTrigger(opponentTurn.ctx)).toBe(
      false,
    );
    expect(effectFor(EffectTiming.OnStartMainPhase, noTs.source, MAIN_KEY).canActivate(noTs.ctx)).toBe(false);
  });
});

describe("BT26-092 [Opponent's Turn]: redirect an opponent's attack onto a [TS] Digimon", () => {
  it("returns a [TS] Tamer to the deck bottom, then offers the redirect", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-ts-tamer", topCard: { instanceId: "my-ts-tamer-top", cardId: TS_TAMER } },
        { permanentId: "my-ts-digimon", topCard: { instanceId: "my-ts-digimon-top", cardId: TS_DIGIMON } },
      ],
    });

    await effectFor(EffectTiming.OnAllyAttack, harness.source, REDIRECT_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["returnToDeck:my-ts-tamer-top:false", "redirectAttack:my-ts-digimon:true"]);
  });

  it("offers only the controller's own [TS] Tamers as the cost", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-ts-tamer", topCard: { instanceId: "my-ts-tamer-top", cardId: TS_TAMER } },
        { permanentId: "my-plain-tamer", topCard: { instanceId: "my-plain-tamer-top", cardId: PLAIN_TAMER } },
        { permanentId: "my-ts-digimon", topCard: { instanceId: "my-ts-digimon-top", cardId: TS_DIGIMON } },
        {
          permanentId: "my-ts-tamer-breeding",
          topCard: { instanceId: "my-ts-tamer-breeding-top", cardId: TS_TAMER },
          inBreeding: true,
        },
      ],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnAllyAttack, harness.source, REDIRECT_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["my-ts-tamer-top"]]);
    expect(harness.calls).toEqual([]);
  });

  it("still pays the cost when no [TS] Digimon can receive the attack", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-ts-tamer", topCard: { instanceId: "my-ts-tamer-top", cardId: TS_TAMER } },
        { permanentId: "my-plain", topCard: { instanceId: "my-plain-top", cardId: PLAIN_DIGIMON } },
      ],
    });

    await effectFor(EffectTiming.OnAllyAttack, harness.source, REDIRECT_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["returnToDeck:my-ts-tamer-top:false"]);
  });

  it("watches the opponent's attacks only, and only on the opponent's turn", () => {
    const source = makeSource();
    const effect = effectFor(EffectTiming.OnAllyAttack, source, REDIRECT_KEY);
    const harness = makeHarness({
      mine: [{ permanentId: "my-ts-tamer", topCard: { instanceId: "my-ts-tamer-top", cardId: TS_TAMER } }],
    });
    const ownTurn = makeHarness({
      mine: [{ permanentId: "my-ts-tamer", topCard: { instanceId: "my-ts-tamer-top", cardId: TS_TAMER } }],
      source: makeSource({ isOwnersTurn: () => true }),
    });

    expect(effect.canTrigger(harness.ctx)).toBe(true);
    expect(effectFor(EffectTiming.OnAllyAttack, ownTurn.source, REDIRECT_KEY).canTrigger(ownTurn.ctx)).toBe(false);
  });
});
