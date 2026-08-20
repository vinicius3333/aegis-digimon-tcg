import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT26-096.js";

// BT26-096 (Kosuke Misono, BT26 Tamer):
//   "[Start of Your Turn] If you have 2 or less memory, set it to 3."
//   "[Main] By returning this Tamer to the bottom of the deck, you may play 1 Digimon card with
//    [Chronomon] in its text or 1 Tamer card with the [TS] trait from your hand or trash with
//    the cost reduced by 2."
//
// FAILS-WHEN-REVERTED: setting memory when it is already above 2 overwrites a healthy memory
// total; playing before the Tamer is returned skips the printed cost; offering a [TS] Digimon
// or a non-[TS] Tamer widens the candidate list; dropping costDelta 2 charges full price.

const CARD_ID = "BT26-096";
const SELF_TOP = "kosuke-top";

const CHRONOMON_DIGIMON = "chronomon-digimon";
const TS_DIGIMON = "ts-digimon";
const TS_TAMER = "ts-tamer";
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
    case CHRONOMON_DIGIMON:
      return fakeDef({ cardId, nameEn: "Clockmon", effectText: "Digivolve into [Chronomon] for free." });
    case TS_DIGIMON:
      return fakeDef({ cardId, nameEn: "Some Digimon", types: ["TS"] });
    case TS_TAMER:
      return fakeDef({ cardId, nameEn: "Toya Kuga", kinds: [CardKind.Tamer] as never, types: ["TS"] });
    case PLAIN_TAMER:
      return fakeDef({ cardId, nameEn: "Other Tamer", kinds: [CardKind.Tamer] as never, types: ["Xros Heart"] });
    default:
      return fakeDef({ cardId, nameEn: "Filler" });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: SELF_TOP,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Tamer] as never }),
    permanent: () => ({ permanentId: "kosuke", topCard: { instanceId: SELF_TOP, cardId: CARD_ID } }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  memory?: number;
  hand?: { instanceId: string; cardId: string }[];
  trash?: { instanceId: string; cardId: string }[];
  pick?: (candidates: string[]) => string[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], trash: options.trash ?? [], battleArea: [] },
    { seat: 1 as Seat, hand: [], trash: [], battleArea: [] },
  ];

  const game: GameAccess = {
    state: { memory: options.memory ?? 0 },
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const fx = {
    setMemory: vi.fn<(...args: any[]) => any>((n: number) => calls.push(`setMemory:${n}`)),
    returnToDeck: vi.fn<(...args: any[]) => any>(async (ids: string[], opts?: { toTop?: boolean }) => {
      calls.push(`returnToDeck:${ids.join(",")}:${opts?.toTop === true}`);
      return [];
    }),
    playInstances: vi.fn<(...args: any[]) => any>(async (ids: string[], opts?: { payCost?: boolean; costDelta?: number }) => {
      calls.push(`playInstances:${ids.join(",")}:${opts?.payCost === true}:${opts?.costDelta}`);
      return [];
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
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

const MEMORY_KEY = "start-turn-set-memory";
const MAIN_KEY = "main-return-self-play-discounted";

describe("BT26-096 [Start of Your Turn]: floor memory at 3", () => {
  it("sets memory to 3 at 2 or less", async () => {
    const harness = makeHarness({ memory: 1 });
    const effect = effectFor(EffectTiming.OnStartTurn, harness.source, MEMORY_KEY);

    expect(effect.canActivate(harness.ctx)).toBe(true);
    await effect.resolve(harness.ctx);

    expect(harness.calls).toEqual(["setMemory:3"]);
  });

  it("leaves a memory total above 2 alone", async () => {
    const harness = makeHarness({ memory: 5 });
    const effect = effectFor(EffectTiming.OnStartTurn, harness.source, MEMORY_KEY);

    expect(effect.canActivate(harness.ctx)).toBe(false);
    await effect.resolve(harness.ctx);

    expect(harness.calls).toEqual([]);
  });

  it("only fires on its controller's own turn from the battle area", () => {
    const offTurn = makeHarness({ memory: 0, source: makeSource({ isOwnersTurn: () => false }) });
    const offField = makeHarness({ memory: 0, source: makeSource({ isOnBattleArea: () => false }) });

    expect(effectFor(EffectTiming.OnStartTurn, offTurn.source, MEMORY_KEY).canTrigger(offTurn.ctx)).toBe(false);
    expect(effectFor(EffectTiming.OnStartTurn, offField.source, MEMORY_KEY).canTrigger(offField.ctx)).toBe(false);
  });
});

describe("BT26-096 [Main]: return this Tamer to play a discounted card", () => {
  it("returns the Tamer to the deck bottom first, then plays the pick at cost -2", async () => {
    const harness = makeHarness({
      hand: [{ instanceId: "hand-chronomon", cardId: CHRONOMON_DIGIMON }],
    });

    await effectFor(EffectTiming.OnDeclaration, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([`returnToDeck:${SELF_TOP}:false`, "playInstances:hand-chronomon:true:2"]);
  });

  it("offers [Chronomon]-text Digimon and [TS] Tamers from hand and trash only", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-chronomon", cardId: CHRONOMON_DIGIMON },
        { instanceId: "hand-ts-digimon", cardId: TS_DIGIMON },
        { instanceId: "hand-plain-tamer", cardId: PLAIN_TAMER },
      ],
      trash: [{ instanceId: "trash-ts-tamer", cardId: TS_TAMER }],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnDeclaration, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["hand-chronomon", "trash-ts-tamer"]]);
  });

  it("still pays the cost when the player declines the play or nothing is eligible", async () => {
    const declined = makeHarness({
      hand: [{ instanceId: "hand-chronomon", cardId: CHRONOMON_DIGIMON }],
      pick: () => [],
    });
    await effectFor(EffectTiming.OnDeclaration, declined.source, MAIN_KEY).resolve(declined.ctx);
    expect(declined.calls).toEqual([`returnToDeck:${SELF_TOP}:false`]);

    const empty = makeHarness({ hand: [{ instanceId: "hand-ts-digimon", cardId: TS_DIGIMON }] });
    await effectFor(EffectTiming.OnDeclaration, empty.source, MAIN_KEY).resolve(empty.ctx);
    expect(empty.calls).toEqual([`returnToDeck:${SELF_TOP}:false`]);
    expect(empty.offered).toEqual([]);
  });

  it("returns itself to the real deck bottom and pays the correctly reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001"],
          trash: [{ card: "BT26-090", as: "tsTamer" }],
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;
    const kosukeCardId = s.perm("kosuke").topCard!.instanceId;
    const kosukePermanentId = s.perm("kosuke").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: kosukeCardId,
        effectKey: `${CARD_ID}/${MAIN_KEY}`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-090"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(kosukeCardId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === kosukePermanentId)).toBe(false);
  });

  it("plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-096", as: "kosukeSecurity" }] },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const kosukeId = s.inst("kosukeSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kosukeId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kosukeId)).toBe(true);
  });
});
