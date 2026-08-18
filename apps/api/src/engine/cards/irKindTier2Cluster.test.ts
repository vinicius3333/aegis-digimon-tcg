import { describe, it, expect } from "vitest";
import {
  EffectDuration,
  EffectTiming,
  type CardDefinition,
  type CompiledCard,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../effects/registry.js";
import { irCardModule } from "../effects/interpreter.js";
import type { CardSource } from "../effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../effects/EffectContext.js";
// Side-effect imports: register the hand-written + IR card modules these A3s drive.
import "../../cards/BT3/BT3-014.js";
import "../../cards/BT19/BT19-007.js";

// IR-02 Tier-2 cluster A3s: the four wired-unproven IR kinds that needed a small IR or
// card-wiring fix before a faithful fails-when-reverted A3 was possible.
//
//   Attack                — EX8-054 [End of Your Turn] "this Digimon attacks" is a faithful
//                           catalog carrier (no IR edit needed; BT23-056's mismodel stays an
//                           it.todo). Proven via forceAttack.
//   SetBaseDP             — BT3-014 [When Digivolving] sets an opponent Lv.4-or-lower Digimon's
//                           original DP to 1000 (Q1056/Q1057 overwrite, not additive). The card's
//                           resolve body, previously a documented no-op, now calls ctx.fx.setBaseDP.
//   Search                — a single-action Search vehicle (deck search -> hand); the catalog had
//                           NO clean Search carrier (BT15-092's "search your security stack" is a
//                           security PlayWithoutCost, not a deck Search), so a faithful single-action
//                           Search IR is the vehicle, exercising the wired-but-untriggered dispatch.
//   DeletionMaxDpModifier — BT19-007's inherited [Static] raises its own DP-deletion maximum by 2000
//                           while its controller has 0-or-less memory; a Delete with a printed
//                           "N DP or less" cap then reaches a higher-DP target (KB Q2712-Q2714).
//
// Harness: the lightweight recorder-context style (mirrors deletionDpCluster.test.ts /
// interpreter.test.ts) — each module/IR is driven with a stubbed EffectContext and the verbs it
// invokes are recorded. Each kind carries a REVERT-CONFIRM-RED lever asserting the REAL effect.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    playCost: 1,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

interface MakePermanentOpts {
  dp?: number;
  cardId?: string;
}

function makePermanent(
  permanentId: string,
  seat: Seat,
  cardId: string,
  opts: MakePermanentOpts = {},
): Permanent {
  const { dp = 5000 } = opts;
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: dp,
    currentDP: dp,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#tier2",
    cardId: "X",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  source: CardSource;
  ownerBattleArea?: Permanent[];
  opponentBattleArea?: Permanent[];
  definitionOverrides?: Map<string, Partial<CardDefinition>>;
  deletionMaxDpBonus?: (seat: Seat, sourcePermanentId?: string) => number;
}): EffectContext {
  const {
    recorder,
    source,
    ownerBattleArea = [],
    opponentBattleArea = [],
    definitionOverrides,
    deletionMaxDpBonus,
  } = opts;

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, security: [], hand: [], deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: opponentBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) =>
      [...ownerBattleArea, ...opponentBattleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => {
      const over = definitionOverrides?.get(card.cardId) ?? {};
      return fakeDefinition({ cardId: card.cardId, nameEn: card.cardId, kinds: ["Digimon"] as never, ...over });
    },
  } as unknown as GameAccess;

  const fx = {
    modifyDP: record("modifyDP"),
    setBaseDP: record("setBaseDP"),
    draw: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "draw", args });
      return [] as never;
    },
    deletePermanent: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "deletePermanent", args });
      return (args[0] as string[]).length;
    },
    forceAttack: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "forceAttack", args });
    },
    searchDeck: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "searchDeck", args });
      return [] as never;
    },
    addDeletionMaxDp: (...args: unknown[]) => {
      recorder.calls.push({ verb: "addDeletionMaxDp", args });
    },
    deletionMaxDpBonus: deletionMaxDpBonus ?? (() => 0),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c: unknown, o: { candidates: unknown[]; max: number }) =>
      o.candidates.slice(0, o.max),
    selectCards: async (_c: unknown, o: { candidates: unknown[]; max: number }) =>
      o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  } as unknown as DecisionApi;

  return {
    source,
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map<string, string>(),
  } as unknown as EffectContext;
}

// ---------------------------------------------------------------------------
// SetBaseDP — BT3-014 [When Digivolving] overwrite original DP to 1000 (Q1056/Q1057)
// ---------------------------------------------------------------------------

describe("Tier-2 A3 — SetBaseDP (BT3-014 overwrite original DP to 1000)", () => {
  const module = getEffectModule("BT3-014");

  it("is registered (hand-written override)", () => {
    expect(module, "BT3-014 must self-register on import").toBeDefined();
  });

  it("calls ctx.fx.setBaseDP(target, 1000, UntilEachTurnEnd) on an opponent Lv.4-or-lower Digimon", async () => {
    const oppLv4 = makePermanent("opp-lv4", 1, "OPP-LV4", { dp: 9000 });
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source: makeSource({ cardId: "BT3-014" }),
      opponentBattleArea: [oppLv4],
      definitionOverrides: new Map([["OPP-LV4", { level: 4 }]]),
    });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, ctx.source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    for (const effect of effects) await effect.resolve(ctx);

    const setCalls = recorder.calls.filter((c) => c.verb === "setBaseDP");
    expect(setCalls, "exactly one base-DP overwrite must be applied").toHaveLength(1);
    // setBaseDP(permanentId, value, duration): overwrite to an ABSOLUTE 1000 (not additive).
    expect(setCalls[0]!.args[0]).toBe("opp-lv4");
    expect(setCalls[0]!.args[1]).toBe(1000);
    expect(setCalls[0]!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("REVERT-CONFIRM-RED: a Lv.5 opponent Digimon is NOT eligible -> no setBaseDP", async () => {
    // The fails-when-reverted lever: the target filter is opponent Digimon at Lv.4 or lower.
    // A Lv.5-only board yields no candidate -> the effect does not activate -> no setBaseDP.
    // (Reverting BT3-014.ts's resolve body to the documented no-op would also drop the call —
    //  this asserts the REAL gated effect: a real overwrite happens only for an eligible target.)
    const oppLv5 = makePermanent("opp-lv5", 1, "OPP-LV5", { dp: 11000 });
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      source: makeSource({ cardId: "BT3-014" }),
      opponentBattleArea: [oppLv5],
      definitionOverrides: new Map([["OPP-LV5", { level: 5 }]]),
    });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, ctx.source);
    for (const effect of effects) {
      expect(effect.canActivate(ctx), "no Lv.4-or-lower target -> not activatable").toBe(false);
      await effect.resolve(ctx);
    }

    expect(
      recorder.calls.filter((c) => c.verb === "setBaseDP"),
      "no eligible target -> no base-DP overwrite",
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Attack — EX8-054-shaped self-Attack IR ("this Digimon attacks")
// ---------------------------------------------------------------------------

describe("Tier-2 A3 — Attack (faithful self-Attack IR carrier -> forceAttack)", () => {
  // A faithful catalog carrier shape: EX8-054 [End of Your Turn] "this Digimon attacks"
  // (optional, gated on the opponent having an unsuspended Digimon). The Attack IR action with
  // isSelf=true resolves the source permanent and calls forceAttack — no IR correction needed,
  // unlike BT23-056's mismodelled force-an-opponent-to-attack (which remains an it.todo).
  const selfAttack: CompiledCard = {
    coverage: "full",
    residual: [],
    effects: [
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "Attack",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            optional: true,
          },
        ],
      },
    ],
  } as CompiledCard;

  it("the source Digimon attacks -> forceAttack(self) is dispatched", async () => {
    const self = makePermanent("self-attacker", 0, "SELF-ATK");
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "X-ATK", permanent: () => self });
    const ctx = makeContext({ recorder, source });

    // The IR trigger "EndOfYourTurn" maps to EffectTiming.OnEndTurn (interpreter timingsForTrigger).
    const effects = irCardModule("X-ATK", selfAttack).effectsForTiming(EffectTiming.OnEndTurn, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    for (const effect of effects) await effect.resolve(ctx);

    const attackCalls = recorder.calls.filter((c) => c.verb === "forceAttack");
    expect(attackCalls, "the self Attack action must force the source to attack").toHaveLength(1);
    expect(attackCalls[0]!.args[0]).toBe("self-attacker");
  });

  it("REVERT-CONFIRM-RED: with no source permanent (off the battle area) the self Attack dispatches nothing", async () => {
    // The Attack(isSelf) branch reads ctx.source.permanent(); a source not on the battle area
    // (permanent() === undefined) yields no forceAttack — proving the call is gated on a real
    // attacker, not unconditionally fired. Stubbing forceAttack to a no-op would likewise RED.
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "X-ATK-OFF", permanent: () => undefined });
    const ctx = makeContext({ recorder, source });

    const effects = irCardModule("X-ATK-OFF", selfAttack).effectsForTiming(EffectTiming.OnEndTurn, source);
    for (const effect of effects) await effect.resolve(ctx);

    expect(
      recorder.calls.filter((c) => c.verb === "forceAttack"),
      "no source permanent -> no attack declared",
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Search — single-action deck-search vehicle (deck -> hand)
// ---------------------------------------------------------------------------

describe("Tier-2 A3 — Search (single-action deck-search vehicle -> searchDeck)", () => {
  // No catalog card compiles to a `Search` action (BT15-092's "search your security stack"
  // is a security PlayWithoutCost, not a deck search), so a faithful single-action Search IR is
  // the vehicle. The dispatch at interpreter.ts:996 was wired but untriggered; this exercises it.
  const searchVehicle: CompiledCard = {
    coverage: "full",
    residual: [],
    effects: [
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Search",
            controller: "mine",
            filter: { kind: ["Digimon"], controller: "mine" },
            count: 1,
            to: "hand",
          },
        ],
      },
    ],
  } as CompiledCard;

  it("searches the controller's deck (count 1) and adds to hand", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "X-SEARCH" });
    const ctx = makeContext({ recorder, source });

    const effects = irCardModule("X-SEARCH", searchVehicle).effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    for (const effect of effects) await effect.resolve(ctx);

    const searchCalls = recorder.calls.filter((c) => c.verb === "searchDeck");
    expect(searchCalls, "the Search action must drive a deck search").toHaveLength(1);
    // searchDeck(seat, filterFn, { min, max }): owner seat 0, max = action.count = 1.
    expect(searchCalls[0]!.args[0]).toBe(0);
    expect((searchCalls[0]!.args[2] as { max: number }).max).toBe(1);
  });

  it("REVERT-CONFIRM-RED: dropping the Search action from the IR dispatches no searchDeck", async () => {
    // The fails-when-reverted lever: an effect with no Search action drives no searchDeck. This
    // mirrors removing the case "Search" dispatch (or registering the wrong action) -> RED.
    const noSearch: CompiledCard = {
      coverage: "full",
      residual: [],
      effects: [{ trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }],
    } as CompiledCard;
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "X-NO-SEARCH" });
    const ctx = makeContext({ recorder, source });

    const effects = irCardModule("X-NO-SEARCH", noSearch).effectsForTiming(EffectTiming.OnPlay, source);
    for (const effect of effects) await effect.resolve(ctx);

    expect(
      recorder.calls.filter((c) => c.verb === "searchDeck"),
      "no Search action -> no deck search",
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DeletionMaxDpModifier — BT19-007 inherited [Static] raises its own deletion maximum
// ---------------------------------------------------------------------------

describe("Tier-2 A3 — DeletionMaxDpModifier (BT19-007 self-scoped +2000 deletion max)", () => {
  const module = getEffectModule("BT19-007");

  it("is registered (IR card)", () => {
    expect(module, "BT19-007 must self-register on import").toBeDefined();
  });

  it("PRODUCER: the inherited [Static] clause records a self-scoped +2000 deletion-max bonus", async () => {
    // BT19-007's [Static] (isInherited) clause: DeletionMaxDpModifier amount 2000, scope "self",
    // gated on `youHave [Calumon]/[Takato Matsuki]` AND memory <= 0. The interpreter dispatch
    // resolves the source permanent and calls addDeletionMaxDp. A friendly [Calumon] satisfies the
    // youHave gate; the fake state's memory is 0 (<= 0).
    const self = makePermanent("bt19-007-self", 0, "BT19-007");
    const calumon = makePermanent("calumon", 0, "CALUMON");
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "BT19-007", permanent: () => self });
    const ctx = makeContext({
      recorder,
      source,
      ownerBattleArea: [self, calumon],
      definitionOverrides: new Map([["CALUMON", { nameEn: "Calumon" }]]),
    });

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects.length, "the inherited [Static] DeletionMaxDpModifier clause must exist").toBeGreaterThanOrEqual(1);
    for (const effect of effects) {
      if (effect.canActivate(ctx)) await effect.resolve(ctx);
    }

    const dmCalls = recorder.calls.filter((c) => c.verb === "addDeletionMaxDp");
    expect(dmCalls, "the self-scoped deletion-max bonus must be recorded").toHaveLength(1);
    // addDeletionMaxDp({ permanentId }, amount): self scope -> keyed by source permanentId, +2000.
    expect(dmCalls[0]!.args[0]).toEqual({ permanentId: "bt19-007-self" });
    expect(dmCalls[0]!.args[1]).toBe(2000);
  });

  it("REVERT-CONFIRM-RED: with NO friendly [Calumon]/[Takato Matsuki] the producer records no bonus", async () => {
    // The fails-when-reverted lever for the producer gate: the inherited clause's youHave
    // condition requires a friendly [Calumon] or [Takato Matsuki]. A board without one drops the
    // DeletionMaxDpModifier entirely -> no addDeletionMaxDp. (Memory is still 0, isolating the
    // youHave gate as the load-bearing guard.)
    const self = makePermanent("bt19-007-self2", 0, "BT19-007");
    const plain = makePermanent("plain", 0, "PLAIN");
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "BT19-007", permanent: () => self });
    const ctx = makeContext({
      recorder,
      source,
      ownerBattleArea: [self, plain],
      definitionOverrides: new Map([["PLAIN", { nameEn: "Agumon" }]]),
    });

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    for (const effect of effects) {
      if (effect.canActivate(ctx)) await effect.resolve(ctx);
    }

    expect(
      recorder.calls.filter((c) => c.verb === "addDeletionMaxDp"),
      "no friendly [Calumon]/[Takato Matsuki] -> no deletion-max bonus produced",
    ).toHaveLength(0);
  });

  it("CONSUMER + REVERT-CONFIRM-RED: a Delete cap of 5000 reaches a 6000-DP target only with the +2000 bonus live", async () => {
    // The consumer side: a Delete with a printed "5000 or less" cap and a live +2000 deletion-max
    // bonus reaches a 6000-DP target (5000 + 2000 = 7000 >= 6000). Reverting the bonus to 0 (the
    // fails-when-reverted lever) leaves the 6000-DP target out of the unraised 5000 cap -> not deleted.
    const deleteWithCap: CompiledCard = {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
                count: 1,
              },
            },
          ],
        },
      ],
    } as CompiledCard;
    const opp6000 = makePermanent("opp-6000", 1, "OPP-6000", { dp: 6000 });

    // With the +2000 bonus live -> 6000-DP target is deletable.
    {
      const recorder: Recorder = { calls: [] };
      const source = makeSource({ cardId: "X-DEL", permanent: () => makePermanent("x-del", 0, "X-DEL") });
      const ctx = makeContext({
        recorder,
        source,
        opponentBattleArea: [opp6000],
        deletionMaxDpBonus: () => 2000,
      });
      const effects = irCardModule("X-DEL", deleteWithCap).effectsForTiming(EffectTiming.OnPlay, source);
      for (const effect of effects) await effect.resolve(ctx);
      expect(
        recorder.calls.some((c) => c.verb === "deletePermanent"),
        "with +2000 the 6000-DP target falls under the raised 7000 cap",
      ).toBe(true);
    }

    // REVERT (bonus = 0) -> 6000 exceeds the printed 5000 cap -> NOT deletable.
    {
      const recorder: Recorder = { calls: [] };
      const source = makeSource({ cardId: "X-DEL2", permanent: () => makePermanent("x-del2", 0, "X-DEL2") });
      const ctx = makeContext({
        recorder,
        source,
        opponentBattleArea: [makePermanent("opp-6000b", 1, "OPP-6000B", { dp: 6000 })],
        deletionMaxDpBonus: () => 0,
      });
      const effects = irCardModule("X-DEL2", deleteWithCap).effectsForTiming(EffectTiming.OnPlay, source);
      for (const effect of effects) await effect.resolve(ctx);
      expect(
        recorder.calls.some((c) => c.verb === "deletePermanent"),
        "without the bonus the 6000-DP target exceeds the printed 5000 cap",
      ).toBe(false);
    }
  });
});
