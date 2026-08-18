import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, EffectDuration, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT13-020.js";

// A3 for BT13-020 (ShineGreymon: Burst Mode)
// [When Digivolving] You may play 1 [Marcus Damon] from your hand without paying the cost.
//   For the turn, the Tamer played is also treated as a 12000 DP Digimon, can't digivolve,
//   and gains <Rush>.
// [Your Turn][Once Per Turn] When one of your Tamers becomes suspended, trash the top card of
//   your opponent's security stack.
//
// FAILS-WHEN-REVERTED: the [Your Turn] trash-security effect fires only when a Tamer on the
// owner's battle area is suspended. Without the Tamer check in canTrigger, any suspension
// would trigger it (wrong), or with the old IR stub it was never a proper EffectModule.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDigimonDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-020",
    set: "BT13",
    nameEn: "ShineGreymon: Burst Mode",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Red],
    playCost: 14,
    dp: 15000,
    level: 7,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeMarcusDamonDef(): CardDefinition {
  return {
    cardId: "BT2-070",
    set: "BT2",
    nameEn: "Marcus Damon",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Red],
    playCost: 4,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#BT13-020",
    cardId: "BT13-020",
    ownerSeat: 0 as Seat,
    definition: fakeDigimonDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Red,
    ...overrides,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  seat0Hand?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  seat0BattleArea?: { permanentId: string; topCard?: { instanceId: string; cardId: string; ownerSeat: Seat }; isSuspended?: boolean; stack?: unknown[] }[];
  seat1Security?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  suspendedPermanentId?: string;
  definitionMap?: Map<string, CardDefinition>;
  playedResult?: { permanentId: string }[];
}): EffectContext {
  const seat0Hand = opts.seat0Hand ?? [];
  const seat0Area = opts.seat0BattleArea ?? [];
  const seat1Security = opts.seat1Security ?? [];
  const defMap = opts.definitionMap ?? new Map<string, CardDefinition>();

  const players = [
    { seat: 0, battleArea: seat0Area, security: [], hand: seat0Hand, deck: [], trash: [] },
    { seat: 1, battleArea: [], security: seat1Security, hand: [], deck: [], trash: [] },
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
      return fakeDigimonDef({ cardId: card.cardId });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return opts.playedResult !== undefined && verb === "playInstances"
        ? Promise.resolve(opts.playedResult)
        : (Promise.resolve([]) as never);
    };

  const fx = {
    playInstances: record("playInstances"),
    grantKind: record("grantKind"),
    setBaseDP: record("setBaseDP"),
    restrict: record("restrict"),
    grantKeyword: record("grantKeyword"),
    trashFromSecurity: record("trashFromSecurity"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(),
    trigger: { suspendedPermanentId: opts.suspendedPermanentId },
    game,
    fx,
    ask,
  };
}

describe("BT13-020 ShineGreymon: Burst Mode", () => {
  const module = getEffectModule("BT13-020");

  it("is registered", () => {
    expect(module, "BT13-020 must self-register on import").toBeDefined();
  });

  it("routes [When Digivolving] to WhenDigivolving timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("routes [Your Turn] Tamer suspend to OnTappedAnyone timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnTappedAnyone, source).length).toBeGreaterThanOrEqual(1);
  });

  it("[When Digivolving] plays Marcus Damon from hand and grants Digimon kind, DP, restrict, Rush", async () => {
    const recorder: Recorder = { calls: [] };
    const marDef = fakeMarcusDamonDef();
    const marInstance = { instanceId: "INST#marcus", cardId: marDef.cardId, ownerSeat: 0 as Seat };
    const playedPermanent = { permanentId: "PERM#marcus" };

    const defMap = new Map<string, CardDefinition>([[marDef.cardId, marDef]]);

    const ctx = makeContext({
      recorder,
      seat0Hand: [marInstance],
      definitionMap: defMap,
      playedResult: [playedPermanent],
    });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    // Should play the Marcus Damon instance.
    const playCallArgs = recorder.calls.find((c) => c.verb === "playInstances")?.args;
    expect(playCallArgs).toBeDefined();
    expect((playCallArgs![0] as string[]).includes("INST#marcus")).toBe(true);

    // Should grant Digimon kind.
    const kindCalls = recorder.calls.filter((c) => c.verb === "grantKind");
    expect(kindCalls.length).toBeGreaterThanOrEqual(1);
    expect(kindCalls[0]!.args[0]).toBe("PERM#marcus");

    // Should set base DP to 12000.
    const dpCalls = recorder.calls.filter((c) => c.verb === "setBaseDP");
    expect(dpCalls.length).toBeGreaterThanOrEqual(1);
    expect(dpCalls[0]!.args[1]).toBe(12000);
    expect(dpCalls[0]!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);

    // Should restrict digivolve.
    const restrictCalls = recorder.calls.filter((c) => c.verb === "restrict" && c.args[1] === "digivolve");
    expect(restrictCalls.length).toBeGreaterThanOrEqual(1);
    expect(restrictCalls[0]!.args[0]).toBe("PERM#marcus");

    // Should grant Rush.
    const rushCalls = recorder.calls.filter((c) => c.verb === "grantKeyword" && c.args[1] === "Rush");
    expect(rushCalls.length).toBeGreaterThanOrEqual(1);
    expect(rushCalls[0]!.args[0]).toBe("PERM#marcus");
  });

  it("[Your Turn] trashes opponent security when own Tamer is the suspended permanent", async () => {
    const recorder: Recorder = { calls: [] };
    const marDef = fakeMarcusDamonDef();
    const tamerPermanent = {
      permanentId: "PERM#tamer",
      topCard: { instanceId: "INST#tamer", cardId: marDef.cardId, ownerSeat: 0 as Seat },
      isSuspended: true,
      stack: [],
    };
    const defMap = new Map<string, CardDefinition>([[marDef.cardId, marDef]]);
    const secCard = { instanceId: "INST#sec", cardId: "SOME-CARD", ownerSeat: 1 as Seat };

    const ctx = makeContext({
      recorder,
      seat0BattleArea: [tamerPermanent],
      seat1Security: [secCard],
      definitionMap: defMap,
      suspendedPermanentId: "PERM#tamer",
    });

    const effects = module!.effectsForTiming(EffectTiming.OnTappedAnyone, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);

    // canTrigger should return true: own Tamer is the suspended permanent.
    const canTrigger = effects[0]!.canTrigger(ctx);
    expect(canTrigger).toBe(true);

    await effects[0]!.resolve(ctx);

    const trashCalls = recorder.calls.filter((c) => c.verb === "trashFromSecurity");
    expect(trashCalls.length).toBeGreaterThanOrEqual(1);
    expect(trashCalls[0]!.args[0]).toBe(1); // opponent seat = 1
    expect(trashCalls[0]!.args[1]).toBe(1); // trash 1
  });

  it("[Your Turn] does NOT fire when the suspended permanent is not an own Tamer", () => {
    const recorder: Recorder = { calls: [] };
    const digimonDef = fakeDigimonDef({ cardId: "OTHER-DIGIMON", nameEn: "SomeDigimon" });
    const digimonPermanent = {
      permanentId: "PERM#digimon",
      topCard: { instanceId: "INST#digimon", cardId: digimonDef.cardId, ownerSeat: 0 as Seat },
      isSuspended: true,
      stack: [],
    };
    const defMap = new Map<string, CardDefinition>([[digimonDef.cardId, digimonDef]]);

    const ctx = makeContext({
      recorder,
      seat0BattleArea: [digimonPermanent],
      definitionMap: defMap,
      suspendedPermanentId: "PERM#digimon",
    });

    const effects = module!.effectsForTiming(EffectTiming.OnTappedAnyone, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    // canTrigger must be false: the suspended permanent is a Digimon, not a Tamer.
    expect(effects[0]!.canTrigger(ctx)).toBe(false);
  });
});
