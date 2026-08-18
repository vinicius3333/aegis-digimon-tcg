import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX11-062.js";

// EX11-062 (Shoto Kazama) [Start of Your Turn] "If you have 2 or less memory, set it
// to 3." This guards the hand-corrected IR condition: the generated form mis-parsed
// the gate as a `youHave` PERMANENT-count condition (always ~true); the fix uses
// `memoryAtMost` (value 2), so SetMemory(3) fires only when memory <= 2. Drives the
// registered IR module through the real interpreter dispatch with a recording fake.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "EX11-062",
    set: "EX11",
    nameEn: "Shoto Kazama",
    kinds: ["Tamer"] as never,
    colors: ["Green"] as never,
    playCost: 4,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#1",
    cardId: "EX11-062",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: { recorder: Recorder; memory: number; turnSeat: Seat }): EffectContext {
  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: opts.memory, players, turnSeat: opts.turnSeat } as unknown as GameState;
  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: (card) => fakeDefinition({ cardId: card.cardId }),
  };
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };
  // Only the verbs this clause can reach need real bodies; the rest throw if touched,
  // surfacing any accidental dispatch.
  const fx = {
    setMemory: record("setMemory"),
    gainMemory: record("gainMemory"),
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: makeSource(), trigger: {}, game, fx, ask };
}

describe("EX11-062 [Start of Your Turn] set memory to 3", () => {
  const module = getEffectModule("EX11-062");

  it("is registered", () => {
    expect(module, "EX11-062 must self-register on import").toBeDefined();
  });

  it("routes to OnStartTurn and nothing else for the memory clause", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThanOrEqual(1);
    // Wrong window contributes no start-of-turn memory effect.
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("sets memory to 3 when the owner has 2 or less memory", async () => {
    const source = makeSource();
    const effect = module!.effectsForTiming(EffectTiming.OnStartTurn, source)[0]!;
    const recorder: Recorder = { calls: [] };
    // Owner is the turn player (the only time [Start of Your Turn] fires); memory 2 <= 2.
    const ctx = makeContext({ recorder, memory: 2, turnSeat: 0 });
    await effect.resolve(ctx);
    const sets = recorder.calls.filter((c) => c.verb === "setMemory");
    expect(sets).toHaveLength(1);
    expect(sets[0]!.args[0]).toBe(3);
  });

  it("does nothing when the owner has more than 2 memory", async () => {
    const source = makeSource();
    const effect = module!.effectsForTiming(EffectTiming.OnStartTurn, source)[0]!;
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, memory: 5, turnSeat: 0 });
    await effect.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "setMemory")).toHaveLength(0);
  });

  it("treats negative (opponent-side) owner memory as 2 or less and sets to 3", async () => {
    const source = makeSource();
    const effect = module!.effectsForTiming(EffectTiming.OnStartTurn, source)[0]!;
    const recorder: Recorder = { calls: [] };
    // memory -1 turn-relative with owner as turn player => owner's own memory is -1 (<= 2).
    const ctx = makeContext({ recorder, memory: -1, turnSeat: 0 });
    await effect.resolve(ctx);
    const sets = recorder.calls.filter((c) => c.verb === "setMemory");
    expect(sets).toHaveLength(1);
    expect(sets[0]!.args[0]).toBe(3);
  });
});
