import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, EffectDuration, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT13-060.js";

// A3 for BT13-060 (Rosemon: Burst Mode)
// [When Digivolving] Suspend 1 of your opponent's Digimon and 1 of their Tamers. Until the end
//   of your opponent's turn, all of their Digimon and Tamers don't unsuspend.
// [When Attacking] Trash the top card of your opponent's security stack for every 2 of your
//   opponent's suspended Digimon and Tamers.
//
// FAILS-WHEN-REVERTED: the [When Digivolving] restrict("unsuspend") is only applied here.
// The old IR had an Unsuspend action (wrong direction) and no restrict call.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDigimonDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT13-060",
    set: "BT13",
    nameEn: "Rosemon: Burst Mode",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Green],
    playCost: 14,
    dp: 14000,
    level: 7,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeTamerDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "TAMER-ID",
    set: "BT1",
    nameEn: "Some Tamer",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Green],
    playCost: 2,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#BT13-060",
    cardId: "BT13-060",
    ownerSeat: 0 as Seat,
    definition: fakeDigimonDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Green,
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
  seat1BattleArea?: FakePermanent[];
  seat1Security?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  definitionMap?: Map<string, CardDefinition>;
}): EffectContext {
  const seat1Area = opts.seat1BattleArea ?? [];
  const seat1Security = opts.seat1Security ?? [];
  const defMap = opts.definitionMap ?? new Map<string, CardDefinition>();

  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: seat1Area, security: seat1Security, hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => seat1Area.find((p) => p.permanentId === id) as never,
    definitionOf: (card) => {
      const def = defMap.get(card.cardId);
      if (def) return def;
      return fakeDigimonDef({ cardId: card.cardId, nameEn: "Unknown" });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return Promise.resolve([] as never);
    };

  const fx = {
    suspend: record("suspend"),
    restrict: record("restrict"),
    trashFromSecurity: record("trashFromSecurity"),
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

describe("BT13-060 Rosemon: Burst Mode", () => {
  const module = getEffectModule("BT13-060");

  it("is registered", () => {
    expect(module, "BT13-060 must self-register on import").toBeDefined();
  });

  it("routes [When Digivolving] to WhenDigivolving timing", () => {
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("routes [When Attacking] to OnAllyAttack timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnAllyAttack, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("[When Digivolving] suspends opponent Digimon, Tamer, and restricts all from unsuspending", async () => {
    const recorder: Recorder = { calls: [] };
    const oppDigiDef = fakeDigimonDef({ cardId: "OPP-DIGI", nameEn: "OppDigimon" });
    const oppTamerDef = fakeTamerDef();

    const oppDigiPerm: FakePermanent = {
      permanentId: "PERM#opp-digi",
      topCard: { instanceId: "INST#opp-digi", cardId: oppDigiDef.cardId, ownerSeat: 1 as Seat },
      isSuspended: false,
      stack: [],
    };
    const oppTamerPerm: FakePermanent = {
      permanentId: "PERM#opp-tamer",
      topCard: { instanceId: "INST#opp-tamer", cardId: oppTamerDef.cardId, ownerSeat: 1 as Seat },
      isSuspended: false,
      stack: [],
    };

    const defMap = new Map<string, CardDefinition>([
      [oppDigiDef.cardId, oppDigiDef],
      [oppTamerDef.cardId, oppTamerDef],
    ]);

    const ctx = makeContext({
      recorder,
      seat1BattleArea: [oppDigiPerm, oppTamerPerm],
      definitionMap: defMap,
    });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    // Should call suspend twice (once for Digimon, once for Tamer).
    const suspendCalls = recorder.calls.filter((c) => c.verb === "suspend");
    expect(suspendCalls.length).toBeGreaterThanOrEqual(2);

    // Should restrict both permanents from unsuspending.
    const restrictCalls = recorder.calls.filter(
      (c) => c.verb === "restrict" && c.args[1] === "unsuspend",
    );
    expect(restrictCalls.length).toBeGreaterThanOrEqual(2);
    expect(restrictCalls[0]!.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
  });

  it("[When Attacking] trashes opponent security for every 2 suspended opponent Digimon/Tamers", async () => {
    const recorder: Recorder = { calls: [] };
    const oppDigiDef = fakeDigimonDef({ cardId: "OPP-DIGI", nameEn: "OppDigimon" });
    const oppTamerDef = fakeTamerDef();

    // 4 suspended permanents → floor(4/2) = 2 security cards trashed
    const oppPerms: FakePermanent[] = [
      { permanentId: "P1", topCard: { instanceId: "I1", cardId: oppDigiDef.cardId, ownerSeat: 1 as Seat }, isSuspended: true, stack: [] },
      { permanentId: "P2", topCard: { instanceId: "I2", cardId: oppDigiDef.cardId, ownerSeat: 1 as Seat }, isSuspended: true, stack: [] },
      { permanentId: "P3", topCard: { instanceId: "I3", cardId: oppTamerDef.cardId, ownerSeat: 1 as Seat }, isSuspended: true, stack: [] },
      { permanentId: "P4", topCard: { instanceId: "I4", cardId: oppTamerDef.cardId, ownerSeat: 1 as Seat }, isSuspended: true, stack: [] },
    ];
    const secCards = [
      { instanceId: "SEC1", cardId: "X", ownerSeat: 1 as Seat },
      { instanceId: "SEC2", cardId: "X", ownerSeat: 1 as Seat },
    ];

    const defMap = new Map<string, CardDefinition>([
      [oppDigiDef.cardId, oppDigiDef],
      [oppTamerDef.cardId, oppTamerDef],
    ]);

    const ctx = makeContext({
      recorder,
      seat1BattleArea: oppPerms,
      seat1Security: secCards,
      definitionMap: defMap,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.canActivate(ctx)).toBe(true);

    await effects[0]!.resolve(ctx);

    const trashCalls = recorder.calls.filter((c) => c.verb === "trashFromSecurity");
    expect(trashCalls.length).toBeGreaterThanOrEqual(1);
    expect(trashCalls[0]!.args[1]).toBe(2); // 4 suspended / 2 = 2
  });
});
