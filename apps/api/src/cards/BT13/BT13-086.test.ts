import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, EffectDuration, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT13-086.js";

// A3 for BT13-086 (Gizmon: XT)
// [On Play] Play 1 [Akihiro Kurata] from your trash without paying the cost.
// [On Deletion] You may play 1 [ProtoGizmon] from your trash without paying the cost.
// Static: <Blocker>, can't digivolve.
// BeforePayCost: delete 1 of your level 4 Digimon → reduce play cost by 6.
//
// FAILS-WHEN-REVERTED: [On Play] only fires when an [Akihiro Kurata] is in the owner's trash.
// The old IR had this as a RawUnparsed that never resolved, so the Akihiro Kurata was never played.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeGizmonXTDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-086",
    set: "BT13",
    nameEn: "Gizmon: XT",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Purple],
    playCost: 12,
    dp: 11000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeAkihiroKurataDef(): CardDefinition {
  return {
    cardId: "BT2-086",
    set: "BT2",
    nameEn: "Akihiro Kurata",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Purple],
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function fakeProtoGizmonDef(): CardDefinition {
  return {
    cardId: "BT13-085",
    set: "BT13",
    nameEn: "ProtoGizmon",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Purple],
    playCost: 5,
    dp: 5000,
    level: 4,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function fakeLv4DigimonDef(): CardDefinition {
  return {
    cardId: "LV4-DIGI",
    set: "BT1",
    nameEn: "SomeLv4Digimon",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Purple],
    playCost: 5,
    dp: 4000,
    level: 4,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#BT13-086",
    cardId: "BT13-086",
    ownerSeat: 0 as Seat,
    definition: fakeGizmonXTDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Purple,
    ...overrides,
  };
}

type FakePermanent = {
  permanentId: string;
  topCard: { instanceId: string; cardId: string; ownerSeat: Seat };
  isSuspended: boolean;
  stack: unknown[];
};

function makeContext(opts: {
  recorder: Recorder;
  seat0BattleArea?: FakePermanent[];
  seat0Trash?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  definitionMap?: Map<string, CardDefinition>;
  deletePermanentResult?: number;
  sourceOnField?: boolean;
}): EffectContext {
  const seat0Area = opts.seat0BattleArea ?? [];
  const seat0Trash = opts.seat0Trash ?? [];
  const defMap = opts.definitionMap ?? new Map<string, CardDefinition>();
  const sourceOnField = opts.sourceOnField ?? true;
  const deletePermanentResult = opts.deletePermanentResult ?? 1;

  const players = [
    { seat: 0, battleArea: seat0Area, security: [], hand: [], deck: [], trash: seat0Trash },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => seat0Area.find((p) => p.permanentId === id) as never,
    definitionOf: (card) => {
      const def = defMap.get(card.cardId);
      if (def) return def;
      return fakeGizmonXTDef({ cardId: card.cardId, nameEn: "Unknown" });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      if (verb === "deletePermanent") return Promise.resolve(deletePermanentResult);
      return Promise.resolve([] as never);
    };

  const fx = {
    playInstances: record("playInstances"),
    deletePermanent: record("deletePermanent"),
    grantKeyword: record("grantKeyword"),
    restrict: record("restrict"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const selfPerm = sourceOnField
    ? { permanentId: "PERM#gizmon-xt", topCard: { instanceId: "INST#BT13-086", cardId: "BT13-086", ownerSeat: 0 as Seat } }
    : undefined;

  const source = makeSource({ permanent: () => selfPerm as never });

  const ctx: EffectContext & { playCostDelta?: number } = {
    source,
    trigger: {},
    game,
    fx,
    ask,
  };
  return ctx;
}

describe("BT13-086 Gizmon: XT", () => {
  const module = getEffectModule("BT13-086");

  it("is registered", () => {
    expect(module, "BT13-086 must self-register on import").toBeDefined();
  });

  it("routes [On Play] to OnPlay timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnPlay, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("routes [On Deletion] to OnDestroyedAnyone timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("routes static effects to None timing", () => {
    expect(module!.effectsForTiming(EffectTiming.None, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("[On Play] plays Akihiro Kurata from trash", async () => {
    const recorder: Recorder = { calls: [] };
    const akihiroDef = fakeAkihiroKurataDef();
    const trashCard = { instanceId: "INST#akihiro", cardId: akihiroDef.cardId, ownerSeat: 0 as Seat };
    const defMap = new Map<string, CardDefinition>([[akihiroDef.cardId, akihiroDef]]);

    const ctx = makeContext({
      recorder,
      seat0Trash: [trashCard],
      definitionMap: defMap,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.canActivate(ctx)).toBe(true);

    await effects[0]!.resolve(ctx);

    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls.length).toBeGreaterThanOrEqual(1);
    expect((playCalls[0]!.args[0] as string[]).includes("INST#akihiro")).toBe(true);
    expect((playCalls[0]!.args[1] as { payCost: boolean }).payCost).toBe(false);
  });

  it("[On Play] canActivate is false when no Akihiro Kurata in trash", () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, seat0Trash: [] });
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[On Deletion] plays ProtoGizmon from trash", async () => {
    const recorder: Recorder = { calls: [] };
    const protoDef = fakeProtoGizmonDef();
    const trashCard = { instanceId: "INST#proto", cardId: protoDef.cardId, ownerSeat: 0 as Seat };
    const defMap = new Map<string, CardDefinition>([[protoDef.cardId, protoDef]]);

    const ctx = makeContext({
      recorder,
      seat0Trash: [trashCard],
      definitionMap: defMap,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.canActivate(ctx)).toBe(true);

    await effects[0]!.resolve(ctx);

    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls.length).toBeGreaterThanOrEqual(1);
    expect((playCalls[0]!.args[0] as string[]).includes("INST#proto")).toBe(true);
    expect((playCalls[0]!.args[1] as { payCost: boolean }).payCost).toBe(false);
  });

  it("[BeforePayCost] deletes Lv4 Digimon and reduces play cost by 6", async () => {
    const recorder: Recorder = { calls: [] };
    const lv4Def = fakeLv4DigimonDef();
    const lv4Perm: FakePermanent = {
      permanentId: "PERM#lv4",
      topCard: { instanceId: "INST#lv4", cardId: lv4Def.cardId, ownerSeat: 0 as Seat },
      isSuspended: false,
      stack: [],
    };
    const defMap = new Map<string, CardDefinition>([[lv4Def.cardId, lv4Def]]);

    const ctx = makeContext({
      recorder,
      seat0BattleArea: [lv4Perm],
      definitionMap: defMap,
      sourceOnField: false,
    }) as EffectContext & { playCostDelta?: number };

    const effects = module!.effectsForTiming(EffectTiming.BeforePayCost, makeSource({ permanent: () => undefined }));
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.canActivate(ctx)).toBe(true);

    await effects[0]!.resolve(ctx);

    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    expect((deleteCalls[0]!.args[0] as string[]).includes("PERM#lv4")).toBe(true);

    expect(ctx.playCostDelta).toBe(6);
  });
});
