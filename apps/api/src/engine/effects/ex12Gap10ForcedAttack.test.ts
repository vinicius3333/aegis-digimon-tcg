import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "./registry.js";
import type { CardSource } from "./CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "./EffectContext.js";
import "../../cards/EX12/EX12-016.js";

// EX12-016 (MetalGreymon) gap #10 — forced-attack grant.
//
// [On Play] / [When Digivolving]:
//   Delete 1 of your opponent's Digimon with 6000 DP or less.
//   Then, give 1 of their Digimon "[Start of Your Main Phase] This Digimon attacks."
//   until their turn ends.
//
// The fix replaces the placeholder GrantStatic(GRANTEFFECT23TOKEN) with the same
// startOfYourMainPhase SubTrigger shape used by BT23-056 and BT12-065 — no
// precondition (unlike BT23-056's [CS] Tamer gate).
//
// Assertions:
//   - resolve() installs a subscribeSubTrigger (delayed grant), NOT an immediate forceAttack.
//   - chooseTargets is offered exactly the opponent's Digimon as candidates (no self-leak).
//   - Both OnPlay and WhenDigivolving trigger windows carry the grant.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "EX12-016",
    set: "EX12",
    nameEn: "MetalGreymon",
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    playCost: 0,
    dp: 10000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(opts: { onBattleArea?: boolean } = {}): CardSource {
  return {
    instanceId: "INST#1",
    cardId: "EX12-016",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => opts.onBattleArea ?? true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeOpponentDigimon(permanentId: string, dp = 5000): import("@aegis/shared").Permanent {
  return {
    permanentId,
    ownerSeat: 1 as Seat,
    topCard: { instanceId: `${permanentId}-top`, cardId: "DUMMY-001", ownerSeat: 1 as Seat },
    stack: [],
    linked: [],
    currentDP: dp,
    isSuspended: false,
  } as unknown as import("@aegis/shared").Permanent;
}

function makeDummyDef(): CardDefinition {
  return {
    cardId: "DUMMY-001",
    nameEn: "Dummy",
    kinds: ["Digimon" as never],
    colors: ["Red" as never],
    playCost: 5,
    dp: 5000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
    set: "BT1",
  } as unknown as CardDefinition;
}

function makeContext(opts: {
  recorder: Recorder;
  opponentBattleArea?: import("@aegis/shared").Permanent[];
}): EffectContext {
  const opponentBattleArea = opts.opponentBattleArea ?? [makeOpponentDigimon("OPP#1")];
  const players = [
    {
      seat: 0 as Seat,
      battleArea: [] as import("@aegis/shared").Permanent[],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
    { seat: 1 as Seat, battleArea: opponentBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 as Seat } as unknown as GameState;
  const permanentMap = new Map<string, import("@aegis/shared").Permanent>(
    opponentBattleArea.map((p) => [p.permanentId, p]),
  );

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => permanentMap.get(id),
    definitionOf: () => makeDummyDef() as unknown as CardDefinition,
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const fx = {
    subscribeSubTrigger: record("subscribeSubTrigger"),
    forceAttack: record("forceAttack"),
    deletePermanent: record("deletePermanent"),
    draw: () => {
      throw new Error("draw must not fire");
    },
    setMemory: () => {
      throw new Error("setMemory must not fire");
    },
    gainMemory: () => {
      throw new Error("gainMemory must not fire");
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource({ onBattleArea: true }),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  };
}

describe("EX12-016 (MetalGreymon) gap #10 — forced-attack SubTrigger grant", () => {
  const module = getEffectModule("EX12-016");

  it("is registered", () => {
    expect(module, "EX12-016 must self-register on import").toBeDefined();
  });

  it("has OnPlay and WhenDigivolving trigger windows", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    // The grant must NOT appear as a stand-alone OnStartMainPhase effect on the source card.
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(0);
  });

  it("[On Play] installs a delayed SubTrigger (subscribeSubTrigger), not an immediate forceAttack", async () => {
    const recorder: Recorder = { calls: [] };
    const effect = module!.effectsForTiming(EffectTiming.OnPlay, makeSource())[0]!;
    const ctx = makeContext({ recorder, opponentBattleArea: [makeOpponentDigimon("OPP#1")] });

    await effect.resolve(ctx);

    const subTriggers = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subTriggers.length).toBeGreaterThanOrEqual(1);

    const attacks = recorder.calls.filter((c) => c.verb === "forceAttack");
    expect(attacks).toHaveLength(0);
  });

  it("[When Digivolving] installs a delayed SubTrigger (subscribeSubTrigger), not an immediate forceAttack", async () => {
    const recorder: Recorder = { calls: [] };
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    const ctx = makeContext({ recorder, opponentBattleArea: [makeOpponentDigimon("OPP#1")] });

    await effect.resolve(ctx);

    const subTriggers = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subTriggers.length).toBeGreaterThanOrEqual(1);

    const attacks = recorder.calls.filter((c) => c.verb === "forceAttack");
    expect(attacks).toHaveLength(0);
  });

  it("[On Play] targets exactly 1 opponent Digimon as the grant recipient", async () => {
    const recorder: Recorder = { calls: [] };
    const chosenTargets: string[] = [];

    const effect = module!.effectsForTiming(EffectTiming.OnPlay, makeSource())[0]!;
    const opp1 = makeOpponentDigimon("OPP#1");
    const opp2 = makeOpponentDigimon("OPP#2");

    const players = [
      { seat: 0 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
      { seat: 1 as Seat, battleArea: [opp1, opp2], security: [], hand: [], deck: [], trash: [] },
    ];
    const state = { memory: 3, players, turnSeat: 0 as Seat } as unknown as GameState;

    const game: GameAccess = {
      state,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id) => [opp1, opp2].find((p) => p.permanentId === id),
      definitionOf: () => makeDummyDef() as unknown as CardDefinition,
    };

    const ask: DecisionApi = {
      optional: async () => true,
      selectPermanents: async () => [],
      chooseTargets: async (_c, o) => {
        chosenTargets.push(...o.candidates);
        return o.candidates.slice(0, 1);
      },
      selectCards: async (_c, o) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    };

    const fx = {
      subscribeSubTrigger: (...args: unknown[]) => {
        recorder.calls.push({ verb: "subscribeSubTrigger", args });
        return 0;
      },
      forceAttack: (...args: unknown[]) => {
        recorder.calls.push({ verb: "forceAttack", args });
        return Promise.resolve();
      },
      deletePermanent: (...args: unknown[]) => {
        recorder.calls.push({ verb: "deletePermanent", args });
        return Promise.resolve();
      },
    } as unknown as Primitives;

    const ctx: EffectContext = {
      source: makeSource({ onBattleArea: true }),
      trigger: {},
      game,
      fx,
      ask,
      selections: new Map(),
    };

    await effect.resolve(ctx);

    // chooseTargets must have been offered only opponent Digimon permanentIds.
    const oppIds = new Set(["OPP#1", "OPP#2"]);
    expect(chosenTargets.some((id) => oppIds.has(id))).toBe(true);
    expect(chosenTargets.every((id) => oppIds.has(id))).toBe(true);

    // No immediate forceAttack during OnPlay resolution.
    expect(recorder.calls.filter((c) => c.verb === "forceAttack")).toHaveLength(0);

    // subscribeSubTrigger must have been called (the delayed grant).
    expect(recorder.calls.filter((c) => c.verb === "subscribeSubTrigger").length).toBeGreaterThanOrEqual(1);
  });
});
