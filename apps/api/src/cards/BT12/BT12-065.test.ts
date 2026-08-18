import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT12-065.js";

// BT12-065 (Sephirothmon) [When Digivolving] — grants 1 opponent Digimon a
// "[Start of Your Main Phase] Attack with this Digimon" trigger that lasts until
// the end of the opponent's turn.
//
// KB basis used per test:
//   Q2197: a "can't attack" Digimon may still be chosen as the target.
//   Q2199: even a Digimon immune to opponent's effects can be chosen; it loses
//          immunity on the opponent's turn and the attack trigger fires.
//   IR analysis: the compiled IR emits two Attack(isSelf) actions instead of a
//          SelectBind-then-grant-sub-trigger sequence. The runtime record mis-parsed
//          the delayed effect as immediate self-attacks.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT12-065",
    set: "BT12",
    nameEn: "Sephirothmon",
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 0,
    dp: 14000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(opts: { onBattleArea?: boolean; permanent?: import("@aegis/shared").Permanent } = {}): CardSource {
  return {
    instanceId: "INST#1",
    cardId: "BT12-065",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => opts.permanent,
    isOnBattleArea: () => opts.onBattleArea ?? true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeOpponentDigimon(permanentId: string): import("@aegis/shared").Permanent {
  return {
    permanentId,
    ownerSeat: 1 as Seat,
    topCard: { instanceId: `${permanentId}-top`, cardId: "DUMMY-001", ownerSeat: 1 as Seat },
    stack: [],
    linked: [],
    currentDP: 5000,
    isSuspended: false,
  } as unknown as import("@aegis/shared").Permanent;
}

function makeContext(opts: {
  recorder: Recorder;
  opponentBattleArea?: import("@aegis/shared").Permanent[];
  sourcePermanent?: import("@aegis/shared").Permanent;
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
    definitionOf: (_card) =>
      ({
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
      }) as unknown as CardDefinition,
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };

  // Only verbs the [When Digivolving] sub-trigger grant chain can reach need recording
  // bodies; every other verb throws on contact so accidental dispatch surfaces loudly.
  const fx = {
    subscribeSubTrigger: record("subscribeSubTrigger"),
    forceAttack: record("forceAttack"),
    // Verbs that MUST NOT fire for this effect — throw so any accidental call is visible.
    draw: () => {
      throw new Error("draw must not fire");
    },
    setMemory: () => {
      throw new Error("setMemory must not fire");
    },
    gainMemory: () => {
      throw new Error("gainMemory must not fire");
    },
    deletePermanent: () => {
      throw new Error("deletePermanent must not fire");
    },
    suspend: () => {
      throw new Error("suspend must not fire");
    },
    trash: () => {
      throw new Error("trash must not fire");
    },
    returnToHand: () => {
      throw new Error("returnToHand must not fire");
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
    source: makeSource({ onBattleArea: true, permanent: opts.sourcePermanent }),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  };
}

describe("BT12-065 (Sephirothmon) [When Digivolving]", () => {
  const module = getEffectModule("BT12-065");

  it("is registered", () => {
    expect(module, "BT12-065 must self-register on import").toBeDefined();
  });

  it("routes to WhenDigivolving and not to other timings", () => {
    // The [When Digivolving] clause must only fire at the WhenDigivolving window.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
  });

  it(// Q2197: you MAY choose an opponent Digimon with a 'can't attack' effect as the target.
  // Q2199: the grant installs a [Start of Your Main Phase] sub-trigger on the CHOSEN OPPONENT
  //        Digimon (delayed, fires on opponent's next main phase); it does NOT call forceAttack
  //        immediately during [When Digivolving] resolution.
  //
  // KB-correct expectation: resolve() installs a subscribeSubTrigger (not forceAttack) so the
  // attack fires at the opponent's next [Start of Your Main Phase] via the delayed grant.
  // The hand-authored IR override (BT12-065.ts) models this as a startOfYourMainPhase
  // SubTrigger granted onto the chosen opponent Digimon (untilOpponentTurnEnd), the same
  // shape as BT23-056.
  "[When Digivolving] installs a delayed sub-trigger (not an immediate attack) on the opponent's chosen Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    const opponentDigimon = makeOpponentDigimon("OPP#1");
    const ctx = makeContext({ recorder, opponentBattleArea: [opponentDigimon] });

    await effect.resolve(ctx);

    // KB-correct: a subscribeSubTrigger must be recorded (the delayed [Start of Main Phase] grant).
    const subTriggers = recorder.calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subTriggers.length).toBeGreaterThanOrEqual(1);

    // KB-correct: forceAttack must NOT fire immediately during [When Digivolving] resolution.
    const attacks = recorder.calls.filter((c) => c.verb === "forceAttack");
    expect(attacks).toHaveLength(0);
  });

  it(// Q2197: choosing an opponent Digimon as target is valid even if it has a "can't attack"
  // effect. The effect selects exactly 1 of the opponent's Digimon as the grant target.
  //
  // KB-correct: SelectBind must resolve to exactly one of the opponent's battle-area Digimon
  // permanentIds.
  //
  // Now PASSES: the WhenDigivolving SelectBind is gated by a youHave{controller:"opponent"}
  // CanSelectPermanent condition; the evaluateCondition controller-clobber fix
  // (interpreter.ts youHave/opponentHas) lets that gate through, so chooseTargets is offered
  // the opponent's Digimon. The preceding regression proves the selected Digimon receives
  // a delayed start-of-main sub-trigger instead of an immediate forceAttack call.
  "[When Digivolving] targets exactly 1 opponent Digimon via player selection (Q2197)", async () => {
    const recorder: Recorder = { calls: [] };
    const chosenTargets: string[] = [];

    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    const opp1 = makeOpponentDigimon("OPP#1");
    const opp2 = makeOpponentDigimon("OPP#2");

    const ask: DecisionApi = {
      optional: async () => true,
      selectPermanents: async () => [],
      chooseTargets: async (_c, o) => {
        // Record which permanentIds were offered (must be opponent Digimon, not self).
        chosenTargets.push(...o.candidates);
        return o.candidates.slice(0, 1);
      },
      selectCards: async (_c, o) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    };

    const game: GameAccess = {
      state: {
        memory: 3,
        players: [
          { seat: 0 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
          { seat: 1 as Seat, battleArea: [opp1, opp2], security: [], hand: [], deck: [], trash: [] },
        ],
        turnSeat: 0 as Seat,
      } as unknown as GameState,
      player: (seat) =>
        (seat === 0
          ? { seat, battleArea: [], security: [], hand: [], deck: [], trash: [] }
          : { seat, battleArea: [opp1, opp2], security: [], hand: [], deck: [], trash: [] }) as never,
      opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id) => [opp1, opp2].find((p) => p.permanentId === id),
      definitionOf: () =>
        ({
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
        }) as unknown as CardDefinition,
    };

    const fx = {
      subscribeSubTrigger: (arg: unknown) => {
        recorder.calls.push({ verb: "subscribeSubTrigger", args: [arg] });
        return 0;
      },
      forceAttack: (...args: unknown[]) => {
        recorder.calls.push({ verb: "forceAttack", args });
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

    // KB-correct: chooseTargets must have been called with candidate(s) from the OPPONENT's
    // battle area only (permanentIds "OPP#1" and/or "OPP#2").
    expect(chosenTargets.length).toBeGreaterThanOrEqual(1);
    expect(chosenTargets.every((id) => id === "OPP#1" || id === "OPP#2")).toBe(true);

    // KB-correct: no forceAttack during WhenDigivolving — attack is delayed.
    expect(recorder.calls.filter((c) => c.verb === "forceAttack")).toHaveLength(0);
  });
});
