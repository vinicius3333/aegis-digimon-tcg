import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";

// BT5-112 (Omnimon Zwart Defeat) is a hand-authored IR override. These tests
// exercise the REGISTERED module (getEffectModule, i.e. what registerIrCard put in
// the registry from the corrected TS literal), NOT effects.json (which still holds
// the stale runtime record IR). They assert the three corrected clauses dispatch the
// right primitives against the right seats/kinds, matching the oracle text + the
// binding Q&A rulings (Q1395/Q1396/Q1397).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X-000",
    set: "X",
    nameEn: "X",
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakePermanent(over: Partial<Permanent>): Permanent {
  return {
    permanentId: "p?",
    controllerSeat: 1 as Seat,
    topCard: undefined,
    stack: [] as never,
    linked: [] as never,
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as Permanent;
}

function makeContext(opts: {
  source: CardSource;
  recorder: Recorder;
  opponentBattleArea?: Permanent[];
  definitionOf?: (id: string) => CardDefinition;
}): EffectContext {
  const rec = opts.recorder;
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      rec.calls.push({ verb, args });
      return undefined as never;
    };

  const opponent = opts.opponentBattleArea ?? [];
  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opponent, security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => opponent.find((p) => p.permanentId === id),
    definitionOf: (card) =>
      opts.definitionOf ? opts.definitionOf(card.cardId) : fakeDefinition({ cardId: card.cardId }),
  };

  const fx = {
    playFromSecurity: async (...a: unknown[]) => {
      rec.calls.push({ verb: "playFromSecurity", args: a });
      return undefined;
    },
    playFromHand: async (...a: unknown[]) => {
      rec.calls.push({ verb: "playFromHand", args: a });
      return [];
    },
    playInstances: async (...a: unknown[]) => {
      rec.calls.push({ verb: "playInstances", args: a });
      return [];
    },
    deletePermanent: async (...a: unknown[]) => {
      rec.calls.push({ verb: "deletePermanent", args: a });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectCards: async (_ctx, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: opts.source, trigger: {}, game, fx, ask };
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#1",
    cardId: "BT5-112",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition({ cardId: "BT5-112" }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

describe("BT5-112 Omnimon Zwart Defeat (hand-authored IR override)", () => {
  async function loadModule() {
    await import("./BT5-112.js"); // self-registers via registerIrCard
    const module = getEffectModule("BT5-112");
    expect(module, "BT5-112 must be registered").toBeDefined();
    return module!;
  }

  it("[Security] plays THIS card from security without paying its cost (Q1395)", async () => {
    const module = await loadModule();
    // The card is a flipped security card: not yet a permanent.
    const source = makeSource({ permanent: () => undefined });

    const effects = module.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);

    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ source, recorder });
    await effects[0]!.resolve(ctx);

    // Must play THIS instance from security (not a filtered play from hand).
    const fromSecurity = recorder.calls.filter((c) => c.verb === "playFromSecurity");
    expect(fromSecurity).toHaveLength(1);
    expect(fromSecurity[0]!.args[0]).toBe("INST#1");
    expect(fromSecurity[0]!.args[1]).toEqual({ payCost: false });
    // Regression guard: the stale IR fell through to a filtered play from the hand.
    expect(recorder.calls.some((c) => c.verb === "playFromHand")).toBe(false);
    expect(recorder.calls.some((c) => c.verb === "playInstances")).toBe(false);
  });

  it("[When Digivolving] deletes 1 of the OPPONENT'S Tamers only", async () => {
    const module = await loadModule();
    const source = makeSource();

    const oppTamer = fakePermanent({
      permanentId: "OPP-TAMER",
      controllerSeat: 1 as Seat,
      topCard: { instanceId: "t1", cardId: "OPP-T", ownerSeat: 1, faceUp: true } as never,
    });
    const oppDigimon = fakePermanent({
      permanentId: "OPP-DIGI",
      controllerSeat: 1 as Seat,
      topCard: { instanceId: "d1", cardId: "OPP-D", ownerSeat: 1, faceUp: true } as never,
    });
    const ownTamer = fakePermanent({
      permanentId: "OWN-TAMER",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "t2", cardId: "OWN-T", ownerSeat: 0, faceUp: true } as never,
    });

    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      source,
      recorder,
      // permanentById only spans the opponent set in the harness; that is fine — the
      // own Tamer being excluded by controller scope is the assertion.
      opponentBattleArea: [oppTamer, oppDigimon],
      definitionOf: (id) =>
        id === "OPP-T" || id === "OWN-T"
          ? fakeDefinition({ kinds: ["Tamer"] as never })
          : fakeDefinition({ kinds: ["Digimon"] as never }),
    });

    // Make own Tamer visible to seat-0 enumeration so we can assert it is NOT targeted.
    (ctx.game.player(0) as { battleArea: Permanent[] }).battleArea = [ownTamer];

    const effects = module.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
    await effects[0]!.resolve(ctx);

    const deletes = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deletes).toHaveLength(1);
    // Only the opponent's Tamer is a legal target (not the opponent's Digimon,
    // not the controller's own Tamer). Q1397: a Digimon-on-Tamer is not a Tamer.
    expect(deletes[0]!.args[0]).toEqual(["OPP-TAMER"]);
  });

  it("[On Deletion] deletes 1 of the opponent's Digimon", async () => {
    const module = await loadModule();
    const source = makeSource();

    const oppDigimon = fakePermanent({
      permanentId: "OPP-DIGI",
      controllerSeat: 1 as Seat,
      topCard: { instanceId: "d1", cardId: "OPP-D", ownerSeat: 1, faceUp: true } as never,
    });

    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      source,
      recorder,
      opponentBattleArea: [oppDigimon],
      definitionOf: () => fakeDefinition({ kinds: ["Digimon"] as never }),
    });

    // On Deletion routes to OnDestroyedAnyone.
    const effects = module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects).toHaveLength(1);
    await effects[0]!.resolve(ctx);

    const deletes = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.args[0]).toEqual(["OPP-DIGI"]);
  });

  it("contributes nothing at unrelated timings", async () => {
    const module = await loadModule();
    const source = makeSource();
    expect(module.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module.effectsForTiming(EffectTiming.OnUseAttack, source)).toHaveLength(0);
    expect(module.effectsForTiming(EffectTiming.None, source)).toHaveLength(0);
  });
});
