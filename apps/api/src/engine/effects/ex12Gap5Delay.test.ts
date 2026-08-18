import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CompiledCard,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { irCardModule } from "./interpreter.js";
import {
  type DecisionApi,
  type EffectContext,
  type GameAccess,
  type Primitives,
} from "./EffectContext.js";
import type { CardSource } from "./CardSource.js";

/**
 * Behavioral coverage for EX12 Engine Gap #5 — ＜Delay＞-active gating on a triggered play.
 *
 * Capability: `PlayWithoutCostAction.requiresDelayArmed = true` gates the play on the
 * source permanent carrying an active Delay keyword grant (armed by a prior `GainKeyword`
 * action on an earlier turn) and consumes that grant on resolution.
 *
 * Four assertions:
 *   (a) play fires when Delay grant is armed; grant is consumed after resolution.
 *   (b) play is skipped when no Delay grant is present.
 *   (c) one play per arm cycle — after the grant is consumed a second call does not fire.
 *   (d) off-field source (permanent() returns undefined) skips unconditionally.
 */

// Minimal card definition used for source and trash candidates.
function def(cardId: string): CardDefinition {
  return {
    cardId,
    set: "T",
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: [] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function perm(permanentId: string, seat: Seat, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}#i`, cardId, ownerSeat: seat, faceUp: true } as never,
    stack: [],
    linked: [],
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

/** Mutable keyword-grant set used in place of a full ContinuousEffectLedger. */
type KeywordGrant = { keyword: string };
function makeKeywordStore(initial: KeywordGrant[] = []): {
  grants: KeywordGrant[];
  grantedKeywords(permanentId: string): { keyword: string }[];
  revokeKeyword(permanentId: string, keyword: string): void;
} {
  // permanentId is irrelevant for these tests (single permanent), so we store all keywords flat.
  const grants = [...initial];
  return {
    grants,
    grantedKeywords: (_permanentId: string) => grants.map((g) => ({ keyword: g.keyword })),
    revokeKeyword: (_permanentId: string, keyword: string) => {
      const idx = grants.findIndex((g) => g.keyword === keyword);
      if (idx !== -1) grants.splice(idx, 1);
    },
  };
}

/**
 * Build a minimal EffectContext for testing `PlayWithoutCost` with `requiresDelayArmed`.
 *
 * `playInstances` calls are recorded in `playCalls`. The trash holds `trashCardIds` as
 * loose instances the play action can pick from.
 */
function makeCtx(opts: {
  sourcePermanent?: Permanent;
  trashCardIds?: string[];
  keywordStore: ReturnType<typeof makeKeywordStore>;
}): { ctx: EffectContext; playCalls: string[][] } {
  const playCalls: string[][] = [];
  const seat: Seat = 0;

  const trashInstances = (opts.trashCardIds ?? []).map((cardId, i) => ({
    instanceId: `trash#${i}`,
    cardId,
    ownerSeat: seat,
    faceUp: true,
  }));

  const sourcePerm = opts.sourcePermanent ?? perm("SRC", seat, "SRC");
  const players = [
    {
      seat,
      battleArea: opts.sourcePermanent ? [opts.sourcePermanent] : [sourcePerm],
      security: [],
      hand: [],
      deck: [],
      trash: trashInstances,
    },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: seat } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => def(card.cardId),
    linkMax: () => 1,
  } as never;

  const fx: Primitives = {
    grantedKeywords: opts.keywordStore.grantedKeywords.bind(opts.keywordStore),
    revokeKeyword: opts.keywordStore.revokeKeyword.bind(opts.keywordStore),
    playInstances: async (ids: string[]) => {
      playCalls.push(ids);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    selectPermanents: async () => [], chooseTargets: async (_c: EffectContext, o: { candidates: string[]; min: number; max: number }) =>
      o.candidates.slice(0, o.max),
    selectCards: async (_c: EffectContext, o: { candidates: string[]; min: number; max: number }) =>
      o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const src: CardSource = {
    instanceId: `${sourcePerm.permanentId}#i`,
    cardId: "SRC",
    ownerSeat: seat,
    definition: def("SRC"),
    permanent: () => opts.sourcePermanent ?? sourcePerm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as never;

  const ctx: EffectContext = {
    source: src,
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as never;

  return { ctx, playCalls };
}

/** The minimal IR shape for a requiresDelayArmed PlayWithoutCost triggered on StartOfYourTurn. */
const delayGatedPlayIr: CompiledCard = {
  coverage: "full",
  residual: [],
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          requiresDelayArmed: true,
          target: {
            filter: { controller: "mine" },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
} as never as CompiledCard;

/** Dynamic Delay activation: the Delay wrapper consumes the armed grant before trashing source. */
const delayActivatedGatedPlayIr: CompiledCard = {
  coverage: "full",
  residual: [],
  effects: [
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          requiresDelayArmed: true,
          target: {
            filter: { controller: "mine" },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
} as never as CompiledCard;

/** Dynamic Delay replacement: the armed grant is the gate/cost for the prevent payload. */
const delayReplacementIr: CompiledCard = {
  coverage: "full",
  residual: [],
  effects: [
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          requiresDelayArmed: true,
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "Prevent" },
          ],
        },
      ],
    },
  ],
} as never as CompiledCard;

async function runStartOfTurn(ctx: EffectContext, src: CardSource): Promise<void> {
  const effects = irCardModule("GAP5-TEST", delayGatedPlayIr).effectsForTiming(
    EffectTiming.OnStartTurn,
    src,
  );
  expect(effects.length, "StartOfYourTurn effect registered").toBeGreaterThan(0);
  await effects[0]!.resolve(ctx);
}

async function runDelayActivation(ctx: EffectContext, src: CardSource): Promise<void> {
  const effects = irCardModule("GAP5-DELAY-ACTIVATION", delayActivatedGatedPlayIr).effectsForTiming(
    EffectTiming.OnDeclaration,
    src,
  );
  expect(effects.length, "Delay [Main] effect registered").toBeGreaterThan(0);
  await effects[0]!.resolve(ctx);
}

async function registerDelayReplacement(ctx: EffectContext, src: CardSource): Promise<{
  preventCheck?: (ctx: EffectContext, leavingPermanentId: string) => Promise<boolean>;
}> {
  let replacement: {
    preventCheck?: (ctx: EffectContext, leavingPermanentId: string) => Promise<boolean>;
  } | undefined;
  (ctx.fx as unknown as { subscribeReplacement: (sub: typeof replacement) => number }).subscribeReplacement = (
    sub,
  ) => {
    replacement = sub;
    return 1;
  };
  const effects = irCardModule("GAP5-DELAY-REPLACEMENT", delayReplacementIr).effectsForTiming(
    EffectTiming.None,
    src,
  );
  expect(effects.length, "Delay Replacement static effect registered").toBeGreaterThan(0);
  await effects[0]!.resolve(ctx);
  expect(replacement?.preventCheck, "preventCheck installed").toBeDefined();
  return replacement!;
}

describe("Gap #5 — requiresDelayArmed PlayWithoutCost (P-243 ＜Delay＞ gating)", () => {
  it("(a) fires when Delay grant is armed; grant is consumed after resolution", async () => {
    const store = makeKeywordStore([{ keyword: "Delay" }]);
    const { ctx, playCalls } = makeCtx({
      trashCardIds: ["CARD_A"],
      keywordStore: store,
    });

    await runStartOfTurn(ctx, ctx.source);

    // The play fired: one batch containing the trash card instance.
    expect(playCalls).toHaveLength(1);
    expect(playCalls[0]).toHaveLength(1);

    // The Delay grant was consumed on resolution.
    expect(store.grants).toHaveLength(0);
  });

  it("(b) play is skipped when no Delay grant is present", async () => {
    const store = makeKeywordStore([]); // no armed Delay
    const { ctx, playCalls } = makeCtx({
      trashCardIds: ["CARD_B"],
      keywordStore: store,
    });

    await runStartOfTurn(ctx, ctx.source);

    expect(playCalls).toHaveLength(0);
  });

  it("(c) one play per arm cycle — second call after consume does not fire", async () => {
    const store = makeKeywordStore([{ keyword: "Delay" }]);
    const { ctx, playCalls } = makeCtx({
      trashCardIds: ["CARD_C"],
      keywordStore: store,
    });

    // First call: armed → fires, grant consumed.
    await runStartOfTurn(ctx, ctx.source);
    expect(playCalls).toHaveLength(1);
    expect(store.grants).toHaveLength(0);

    // Second call (simulating a subsequent turn without re-arming): must not fire.
    await runStartOfTurn(ctx, ctx.source);
    expect(playCalls).toHaveLength(1); // still only the original call
  });

  it("(d) off-field source skips unconditionally, even if grant is present", async () => {
    const store = makeKeywordStore([{ keyword: "Delay" }]);

    // Build a source whose permanent() returns undefined (off-field).
    const seat: Seat = 0;
    const players = [
      { seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
      { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: seat } as never,
      player: (s: Seat) => players[s] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: (card: { cardId: string }) => def(card.cardId),
      linkMax: () => 1,
    } as never;

    const playCalls: string[][] = [];
    const fx: Primitives = {
      grantedKeywords: store.grantedKeywords.bind(store),
      revokeKeyword: store.revokeKeyword.bind(store),
      playInstances: async (ids: string[]) => {
        playCalls.push(ids);
      },
    } as unknown as Primitives;

    const ask: DecisionApi = {
      optional: async () => true,
      selectPermanents: async () => [], chooseTargets: async (_c: EffectContext, o: { candidates: string[]; min: number; max: number }) =>
        o.candidates.slice(0, o.max),
      selectCards: async (_c: EffectContext, o: { candidates: string[]; min: number; max: number }) =>
        o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    };

    // off-field: permanent() returns undefined
    const offFieldSrc: CardSource = {
      instanceId: "SRC#i",
      cardId: "SRC",
      ownerSeat: seat,
      definition: def("SRC"),
      permanent: () => undefined,
      isOnBattleArea: () => false,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as never;

    const ctx: EffectContext = {
      source: offFieldSrc,
      trigger: {},
      game,
      fx,
      ask,
      selections: new Map(),
    } as never;

    const effects = irCardModule("GAP5-OFFFIELD", delayGatedPlayIr).effectsForTiming(
      EffectTiming.OnStartTurn,
      offFieldSrc,
    );
    expect(effects.length).toBeGreaterThan(0);
    await effects[0]!.resolve(ctx);

    // Off-field: play must not fire and grant must remain unconsumed.
    expect(playCalls).toHaveLength(0);
    expect(store.grants).toHaveLength(1);
  });

  it("(e) dynamic [Main] ＜Delay＞ activation consumes the armed grant before trashing source", async () => {
    const store = makeKeywordStore([{ keyword: "Delay" }]);
    const { ctx, playCalls } = makeCtx({
      trashCardIds: ["CARD_D"],
      keywordStore: store,
    });
    const deleteCalls: string[][] = [];
    (ctx.fx as unknown as { deletePermanent: (ids: string[]) => Promise<number> }).deletePermanent = async (
      ids,
    ) => {
      deleteCalls.push(ids);
      return ids.length;
    };

    await runDelayActivation(ctx, ctx.source);

    expect(deleteCalls).toHaveLength(1);
    expect(playCalls).toHaveLength(1);
    expect(store.grants).toHaveLength(0);
  });

  it("(f) dynamic [Main] ＜Delay＞ activation without an armed grant does not trash or play", async () => {
    const store = makeKeywordStore([]);
    const { ctx, playCalls } = makeCtx({
      trashCardIds: ["CARD_E"],
      keywordStore: store,
    });
    const deleteCalls: string[][] = [];
    (ctx.fx as unknown as { deletePermanent: (ids: string[]) => Promise<number> }).deletePermanent = async (
      ids,
    ) => {
      deleteCalls.push(ids);
      return ids.length;
    };

    await runDelayActivation(ctx, ctx.source);

    expect(deleteCalls).toHaveLength(0);
    expect(playCalls).toHaveLength(0);
  });

  it("(g) dynamic Replacement ＜Delay＞ consumes grant, trashes source, then runs prevent payload", async () => {
    const store = makeKeywordStore([{ keyword: "Delay" }]);
    const { ctx } = makeCtx({ keywordStore: store });
    (ctx.game.state as unknown as { turnCount: number }).turnCount = 2;
    (ctx.source.permanent() as unknown as { enterFieldTurnCount: number }).enterFieldTurnCount = 1;
    const deleteCalls: string[][] = [];
    let gained = 0;
    (ctx.fx as unknown as { deletePermanent: (ids: string[]) => Promise<number> }).deletePermanent = async (
      ids,
    ) => {
      deleteCalls.push(ids);
      return ids.length;
    };
    (ctx.fx as unknown as { gainMemoryForSeat: () => void }).gainMemoryForSeat = () => {
      gained += 1;
    };

    const replacement = await registerDelayReplacement(ctx, ctx.source);
    const prevented = await replacement.preventCheck!(ctx, ctx.source.permanent()!.permanentId);

    expect(prevented).toBe(true);
    expect(deleteCalls).toHaveLength(1);
    expect(gained).toBe(1);
    expect(store.grants).toHaveLength(0);
  });

  it("(h) dynamic Replacement ＜Delay＞ without an armed grant does not trash or prevent", async () => {
    const store = makeKeywordStore([]);
    const { ctx } = makeCtx({ keywordStore: store });
    (ctx.game.state as unknown as { turnCount: number }).turnCount = 2;
    (ctx.source.permanent() as unknown as { enterFieldTurnCount: number }).enterFieldTurnCount = 1;
    const deleteCalls: string[][] = [];
    (ctx.fx as unknown as { deletePermanent: (ids: string[]) => Promise<number> }).deletePermanent = async (
      ids,
    ) => {
      deleteCalls.push(ids);
      return ids.length;
    };

    const replacement = await registerDelayReplacement(ctx, ctx.source);
    const prevented = await replacement.preventCheck!(ctx, ctx.source.permanent()!.permanentId);

    expect(prevented).toBe(false);
    expect(deleteCalls).toHaveLength(0);
  });
});
