import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT26-097.js";

// BT26-097 (The Thunder Emperor Awakens, BT26 Option):
//   "Add 1 to this card's use cost for each of your security cards."
//   "[Main] By placing 1 of your Tamers with [Dan Yuki] or [Kanan Yuki] in their names as any
//    of your [Aegiomon]'s bottom digivolution card, it may digivolve into [Jupitermon] in the
//    hand or trash, ignoring digivolution requirements and without paying the cost. After, you
//    may place 1 card with [Aegiochusmon] in its name in your trash as any of your
//    [Jupitermon]'s top digivolution card."
//
// FAILS-WHEN-REVERTED: placing with belowTop:true puts the Tamer on TOP of the stack instead of
// the printed bottom; digivolving before the cost resolves skips the printed "By ..."; running
// the Aegiochusmon tail when the placement failed skips the same gate; sourcing Aegiochusmon
// from hand widens the printed "in your trash".

const CARD_ID = "BT26-097";

const DAN_YUKI = "dan-yuki";
const KANAN_YUKI = "kanan-yuki";
const OTHER_TAMER = "other-tamer";
const AEGIOMON = "aegiomon";
const JUPITERMON = "jupitermon";
const AEGIOCHUSMON = "aegiochusmon";
const FILLER = "filler";

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
    case DAN_YUKI:
      return fakeDef({ cardId, nameEn: "Dan Yuki", kinds: [CardKind.Tamer] as never });
    case KANAN_YUKI:
      return fakeDef({ cardId, nameEn: "Kanan Yuki", kinds: [CardKind.Tamer] as never });
    case OTHER_TAMER:
      return fakeDef({ cardId, nameEn: "Kosuke Misono", kinds: [CardKind.Tamer] as never });
    case AEGIOMON:
      return fakeDef({ cardId, nameEn: "Aegiomon" });
    case JUPITERMON:
      return fakeDef({ cardId, nameEn: "Jupitermon" });
    case AEGIOCHUSMON:
      return fakeDef({ cardId, nameEn: "Aegiochusmon: Blue" });
    default:
      return fakeDef({ cardId, nameEn: "Filler" });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "thunder-option",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID, kinds: [CardKind.Option] as never }),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

interface Perm {
  permanentId: string;
  topCard?: { cardId: string };
  inBreeding?: boolean;
}

function makeHarness(options: {
  mine?: Perm[];
  hand?: { instanceId: string; cardId: string }[];
  trash?: { instanceId: string; cardId: string }[];
  security?: unknown[];
  pick?: (candidates: string[]) => string[];
  relocateSucceeds?: boolean;
  withRelocate?: boolean;
}) {
  const players = [
    {
      seat: 0 as Seat,
      battleArea: options.mine ?? [],
      hand: options.hand ?? [],
      trash: options.trash ?? [],
      security: options.security ?? [],
    },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const costFilters: ((facts: { def: CardDefinition; controllerSeat: Seat }) => boolean)[] = [];
  const fx = {
    changePlayCost: vi.fn<(...args: any[]) => any>(
      (filter: (facts: { def: CardDefinition; controllerSeat: Seat }) => boolean, delta: number) => {
        costFilters.push(filter);
        calls.push(`changePlayCost:${delta}`);
      },
    ),
    ...(options.withRelocate === false
      ? {}
      : {
          relocatePermanentByEffect: vi.fn<(...args: any[]) => any>(async (dest: string, src: string, opts?: { belowTop?: boolean }) => {
            calls.push(`relocate:${dest}:${src}:${opts?.belowTop === true}`);
            return options.relocateSucceeds !== false;
          }),
        }),
    digivolveFromInstance: vi.fn<(...args: any[]) => any>(async (target: string, instance: string, opts?: unknown) => {
      calls.push(`digivolve:${target}:${instance}:${JSON.stringify(opts)}`);
      return undefined;
    }),
    placeUnder: vi.fn<(...args: any[]) => any>(async (target: string, ids: string[], opts?: { belowTop?: boolean }) => {
      calls.push(`placeUnder:${target}:${ids.join(",")}:${opts?.belowTop === true}`);
      return [];
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
    selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, calls, costFilters, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const COST_KEY = "use-cost-plus-security-count";
const MAIN_KEY = "main-place-tamer-digivolve-jupitermon";

const fullBoard = () => ({
  mine: [
    { permanentId: "my-dan", topCard: { cardId: DAN_YUKI } },
    { permanentId: "my-aegiomon", topCard: { cardId: AEGIOMON } },
    { permanentId: "my-jupitermon", topCard: { cardId: JUPITERMON } },
  ],
  hand: [{ instanceId: "hand-jupitermon", cardId: JUPITERMON }],
  trash: [{ instanceId: "trash-aegiochusmon", cardId: AEGIOCHUSMON }],
});

describe("BT26-097 use-cost surcharge", () => {
  it("adds 1 per security card, keyed to this card and controller", async () => {
    const harness = makeHarness({ security: [{}, {}, {}] });

    await effectFor(EffectTiming.None, harness.source, COST_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["changePlayCost:3"]);
    const filter = harness.costFilters[0]!;
    expect(filter({ def: fakeDef({ cardId: CARD_ID }), controllerSeat: 0 as Seat })).toBe(true);
    expect(filter({ def: fakeDef({ cardId: CARD_ID }), controllerSeat: 1 as Seat })).toBe(false);
    expect(filter({ def: fakeDef({ cardId: "BT26-096" }), controllerSeat: 0 as Seat })).toBe(false);
  });

  it("records nothing with an empty security stack", async () => {
    const harness = makeHarness({ security: [] });

    await effectFor(EffectTiming.None, harness.source, COST_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([]);
  });
});

describe("BT26-097 [Main]: place a Yuki Tamer under Aegiomon, digivolve, then bury Aegiochusmon", () => {
  it("runs the full chain in printed order", async () => {
    const harness = makeHarness(fullBoard());

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([
      "relocate:my-aegiomon:my-dan:false",
      'digivolve:my-aegiomon:hand-jupitermon:{"ignoreRequirements":true}',
      "placeUnder:my-jupitermon:trash-aegiochusmon:true",
    ]);
  });

  it("offers only [Dan Yuki]/[Kanan Yuki] Tamers as the cost", async () => {
    const board = fullBoard();
    const harness = makeHarness({
      ...board,
      mine: [
        ...board.mine,
        { permanentId: "my-kanan", topCard: { cardId: KANAN_YUKI } },
        { permanentId: "my-other-tamer", topCard: { cardId: OTHER_TAMER } },
        { permanentId: "my-aegiomon-breeding", topCard: { cardId: AEGIOMON }, inBreeding: true },
      ],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["my-dan", "my-kanan"]]);
    expect(harness.calls).toEqual([]);
  });

  it("does nothing when there is no eligible Tamer or no Aegiomon", async () => {
    const noTamer = makeHarness({
      mine: [{ permanentId: "my-aegiomon", topCard: { cardId: AEGIOMON } }],
      hand: [{ instanceId: "hand-jupitermon", cardId: JUPITERMON }],
    });
    await effectFor(EffectTiming.OnUseOption, noTamer.source, MAIN_KEY).resolve(noTamer.ctx);
    expect(noTamer.calls).toEqual([]);

    const noAegiomon = makeHarness({
      mine: [{ permanentId: "my-dan", topCard: { cardId: DAN_YUKI } }],
      hand: [{ instanceId: "hand-jupitermon", cardId: JUPITERMON }],
    });
    await effectFor(EffectTiming.OnUseOption, noAegiomon.source, MAIN_KEY).resolve(noAegiomon.ctx);
    expect(noAegiomon.calls).toEqual([]);
  });

  it("aborts the whole clause when the cost placement fails", async () => {
    const harness = makeHarness({ ...fullBoard(), relocateSucceeds: false });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["relocate:my-aegiomon:my-dan:false"]);
  });

  it("still runs the Aegiochusmon tail when no Jupitermon card is available to digivolve into", async () => {
    const board = fullBoard();
    const harness = makeHarness({ ...board, hand: [{ instanceId: "hand-filler", cardId: FILLER }] });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([
      "relocate:my-aegiomon:my-dan:false",
      "placeUnder:my-jupitermon:trash-aegiochusmon:true",
    ]);
  });

  it("skips the tail with no Aegiochusmon in trash", async () => {
    const board = fullBoard();
    const harness = makeHarness({ ...board, trash: [{ instanceId: "trash-filler", cardId: FILLER }] });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([
      "relocate:my-aegiomon:my-dan:false",
      'digivolve:my-aegiomon:hand-jupitermon:{"ignoreRequirements":true}',
    ]);
  });

  it("aborts when the optional relocate primitive is unavailable", async () => {
    const harness = makeHarness({ ...fullBoard(), withRelocate: false });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([]);
  });

  it("resolves the complete chain on a real evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-097", as: "option" },
            { card: "BT26-033", as: "jupitermon" },
          ],
          trash: [{ card: "BT26-029", as: "aegiochusmon" }],
          battleArea: [
            { card: "BT25-086", as: "dan" },
            { card: "BT24-034", as: "aegiomon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const danId = s.perm("dan").topCard!.instanceId;
    const danPermanentId = s.perm("dan").permanentId;
    const oldAegiomonId = s.perm("aegiomon").topCard!.instanceId;
    const aegiochusmonId = s.inst("aegiochusmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("aegiomon").topCard?.instanceId === s.inst("jupitermon").instanceId);
    await settle(() => s.perm("aegiomon").stack.some((card) => card.instanceId === aegiochusmonId));

    expect(s.perm("aegiomon").topCard!.cardId).toBe("BT26-033");
    expect(s.perm("aegiomon").stack.map((card) => card.instanceId)).toEqual([
      danId,
      oldAegiomonId,
      aegiochusmonId,
    ]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === danPermanentId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT26-097 [Security]", () => {
  it("plays an eligible TS permanent from hand for free, then returns itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-090", as: "tsTamer" }],
          security: [{ card: "BT26-097", as: "optionSecurity" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const optionId = s.inst("optionSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-090")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(optionId);
  });
});
