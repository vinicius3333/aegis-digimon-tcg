import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import type { EvoCostMatch } from "../../engine/effects/modifiers.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT20-029.js";

// A3 for BT20-029 (Pulsemon — Yellow Lv.3 Digimon):
//   [Your Turn] When this Digimon would digivolve into a [Pulsemon]-text / [SEEKERS] Digimon,
//     reduce the digivolution cost by 1.
//   (Inherited) [All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon
//     in battle, gain 1 memory.
//
// FAILS-WHEN-REVERTED: the RawUnparsed IR stub never emits the ESS gain-memory, and the IR
// reduceCost replacement is replaced here by an explicit changeEvoCost gated to this permanent
// digivolving into a matching card. Both observable outcomes are asserted via recorder verbs.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

const SELF_PERM = "SELF-PERM";

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT20-029",
    set: "BT20",
    nameEn: "Pulsemon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 3,
    dp: 2000,
    level: 3,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(): Permanent {
  return {
    permanentId: SELF_PERM,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "self-top", cardId: "BT20-029", ownerSeat: 0 as Seat, faceUp: true } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 2000,
    currentDP: 2000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(opts: { isOwnersTurn?: boolean; onField?: boolean } = {}): CardSource {
  const perm = makePermanent();
  return {
    instanceId: "self-top",
    cardId: "BT20-029",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => perm,
    isOnBattleArea: () => opts.onField ?? true,
    isOwnersTurn: () => opts.isOwnersTurn ?? true,
    hasColor: () => false,
  } as unknown as CardSource;
}

function makeContext(opts: { recorder: Recorder; source: CardSource; trigger?: EffectContext["trigger"] }): EffectContext {
  const rec = opts.recorder;
  const game: GameAccess = {
    state: { memory: 0, players: [], turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => ({ seat, battleArea: [], security: [], hand: [], deck: [], trash: [] }) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDefinition({ cardId: card.cardId }),
  };
  const fx = {
    changeEvoCost: (...args: unknown[]) => {
      rec.calls.push({ verb: "changeEvoCost", args });
    },
    gainMemoryForSeat: (...args: unknown[]) => {
      rec.calls.push({ verb: "gainMemoryForSeat", args });
    },
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: opts.source, trigger: opts.trigger ?? {}, game, fx, ask };
}

describe("BT20-029 Pulsemon", () => {
  const module = getEffectModule("BT20-029");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("[Your Turn] registers a changeEvoCost of -1 for this permanent on owner's turn", async () => {
    const source = makeSource({ isOwnersTurn: true, onField: true });
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source });
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.canTrigger(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    const evo = recorder.calls.filter((c) => c.verb === "changeEvoCost");
    expect(evo).toHaveLength(1);
    expect(evo[0]!.args[1]).toBe(-1);

    // The predicate matches this permanent digivolving INTO a [SEEKERS] Digimon, and rejects
    // a non-matching base / non-matching into.
    const predicate = evo[0]!.args[0] as (m: EvoCostMatch) => boolean;
    const selfPerm = source.permanent()!;
    const seekersInto = fakeDefinition({ cardId: "X", types: ["SEEKERS"] as never });
    const plainInto = fakeDefinition({ cardId: "Y", types: [] as never, nameEn: "Other" });
    expect(predicate({ target: selfPerm, into: seekersInto })).toBe(true);
    expect(predicate({ target: selfPerm, into: plainInto })).toBe(false);
    expect(predicate({ target: { permanentId: "OTHER" } as never, into: seekersInto })).toBe(false);
    expect(predicate({ target: selfPerm, into: undefined })).toBe(false);
  });

  it("[Your Turn] does NOT trigger on the opponent's turn", () => {
    const source = makeSource({ isOwnersTurn: false, onField: true });
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source });
    const [effect] = module!.effectsForTiming(EffectTiming.None, source);
    expect(effect!.canTrigger(ctx)).toBe(false);
  });

  it("[ESS] gains 1 memory when the host is the surviving battle winner", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source,
      trigger: { attackerPermanentId: SELF_PERM, deletedPermanentId: "OPP" },
    });
    const effects = module!.effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isInherited).toBe(true);
    expect(effects[0]!.maxPerTurn).toBe(1);
    expect(effects[0]!.canTrigger(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    const mem = recorder.calls.filter((c) => c.verb === "gainMemoryForSeat");
    expect(mem).toHaveLength(1);
    expect(mem[0]!.args[0]).toBe(0);
    expect(mem[0]!.args[1]).toBe(1);
  });

  it("[ESS] does NOT trigger when a different permanent was the battle winner (Q4324 host must survive/be winner)", () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source,
      trigger: { attackerPermanentId: "SOMEONE-ELSE", deletedPermanentId: "OPP" },
    });
    const [effect] = module!.effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    expect(effect!.canTrigger(ctx)).toBe(false);
  });
});
