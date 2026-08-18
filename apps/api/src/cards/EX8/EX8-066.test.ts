import { describe, it, expect } from "vitest";
import { CardKind, CardColor, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX8-066.js";

// A3 for EX8-066 (Suzune Kazuki) — Blue Tamer.
//
// Implemented clauses:
//   [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
//   [Security] Play this card without paying the cost.
//
// RESIDUAL: [All Turns] Ice-Snow sub-trigger clause is inert (sub-trigger bus unwired).
//
// FAILS-WHEN-REVERTED: removing the hand-written module reverts to the declarative effect
// which routes [Start of Your Main Phase] through the interpreter's GainMemory action with
// a conditional. The interpreter path does not call ctx.fx.gainMemory directly in a way
// the fake-context recorder here can observe, so gainMemory would not be called → test RED.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function digimonDef(cardId: string): CardDefinition {
  return {
    cardId,
    set: "EX8",
    nameEn: `Digi-${cardId}`,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Blue],
    playCost: 4,
    dp: 5000,
    level: 4,
    types: ["Aquan"],
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function tamerDef(): CardDefinition {
  return {
    cardId: "EX8-066",
    set: "EX8",
    nameEn: "Suzune Kazuki",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Blue],
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

let _seq = 0;
function inst(cardId: string, seat: Seat = 0) {
  return { instanceId: `inst-${++_seq}`, cardId, ownerSeat: seat, faceUp: true };
}

function makeSelfPerm() {
  return {
    permanentId: "SELF-PERM",
    topCard: inst("EX8-066"),
    isSuspended: false,
    inBreeding: false,
    stack: [],
    controllerSeat: 0 as Seat,
    currentDP: 0,
  };
}

function makeSource(selfPerm = makeSelfPerm()): CardSource {
  return {
    instanceId: selfPerm.topCard.instanceId,
    cardId: "EX8-066",
    ownerSeat: 0 as Seat,
    definition: tamerDef(),
    permanent: () => selfPerm as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Blue,
  };
}

function makeCtx(opts: {
  recorder: Recorder;
  oppDigimonCount?: number;
}): EffectContext {
  const selfPerm = makeSelfPerm();
  const oppCount = opts.oppDigimonCount ?? 1;

  const oppPerms = Array.from({ length: oppCount }, (_, i) => ({
    permanentId: `OPP-${i}`,
    topCard: inst(`OPP-DIGI-${i}`, 1 as Seat),
    isSuspended: false,
    inBreeding: false,
    stack: [],
    controllerSeat: 1 as Seat,
    currentDP: 5000,
  }));

  const defMap = new Map<string, CardDefinition>();
  defMap.set("EX8-066", tamerDef());
  for (let i = 0; i < oppCount; i++) {
    defMap.set(`OPP-DIGI-${i}`, digimonDef(`OPP-DIGI-${i}`));
  }

  const players = [
    { seat: 0 as Seat, battleArea: [selfPerm], hand: [], deck: [], trash: [], security: [] },
    { seat: 1 as Seat, battleArea: oppPerms, hand: [], deck: [], trash: [], security: [] },
  ];

  const recorder = opts.recorder;

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => {
      if (id === "SELF-PERM") return selfPerm as never;
      return undefined as never;
    },
    definitionOf: (card) => defMap.get(card.cardId) ?? digimonDef(card.cardId),
  };

  const fx = {
    gainMemory: (...args: unknown[]) => recorder.calls.push({ verb: "gainMemory", args }),
    playFromSecurity: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playFromSecurity", args });
      return undefined;
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
    source: makeSource(selfPerm),
    trigger: {},
    game,
    fx,
    ask,
  };
}

describe("EX8-066 Suzune Kazuki", () => {
  const module = getEffectModule("EX8-066");

  it("is registered", () => {
    expect(module).toBeDefined();
  });

  it("routes [Start of Your Main Phase] to OnStartMainPhase timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("routes [Security] to SecuritySkill timing", () => {
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("[Start of Your Main Phase] canActivate true when opponent has a Digimon", () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppDigimonCount: 1 });
    const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, makeSource());
    expect(effects[0]!.canActivate(ctx)).toBe(true);
  });

  it("[Start of Your Main Phase] canActivate false when opponent has no Digimon", () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppDigimonCount: 0 });
    const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, makeSource());
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[Start of Your Main Phase] calls gainMemory(1) when opponent has a Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppDigimonCount: 1 });
    const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, makeSource());
    await effects[0]!.resolve(ctx);
    expect(recorder.calls.some((c) => c.verb === "gainMemory")).toBe(true);
    const call = recorder.calls.find((c) => c.verb === "gainMemory");
    expect(call!.args[0]).toBe(1);
  });

  it("[Start of Your Main Phase] does NOT call gainMemory when opponent has no Digimon (canActivate blocks)", () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppDigimonCount: 0 });
    const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, makeSource());
    // canActivate returns false — the effect engine would not call resolve; verify the guard.
    expect(effects[0]!.canActivate(ctx)).toBe(false);
    expect(recorder.calls.filter((c) => c.verb === "gainMemory").length).toBe(0);
  });

  it("[Security] calls playFromSecurity with payCost: false", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder });
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    await effects[0]!.resolve(ctx);
    const call = recorder.calls.find((c) => c.verb === "playFromSecurity");
    expect(call).toBeDefined();
    expect(call!.args[1]).toMatchObject({ payCost: false });
  });
});
