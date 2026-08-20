import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  EffectDuration,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT10-042.js";

// BT10-042 (Venusmon)
//
// [When Digivolving] All of your opponent's Digimon gain <Security Attack -1> until
// the end of your opponent's turn.
// [Opponent's Turn] All of your opponent's Digimon WITH <Security Attack> can't attack
// this Digimon and can't activate [When Attacking] and [When Digivolving] effects.
//
// Key rulings tested:
//   Q1965: "Digimon with <Security Attack>" means any Digimon affected by SA+ OR SA-.
//   Q1966: +1 and -1 on the same Digimon do NOT cancel; it still "has SecurityAttack".
//   documented behavior: AttackerCondition / InvalidateCondition both gate on
//   `HasSecurityAttackChanges` — a Digimon WITHOUT SecurityAttack is not restricted.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT10-042",
    set: "BT10",
    nameEn: "Venusmon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 12,
    dp: 12000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(
  permanentId: string,
  seat: Seat,
  cardId: string,
  _effectText?: string,
): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#BT10-042",
    cardId: "BT10-042",
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
  ownerBattleArea?: Permanent[];
  opponentBattleArea?: Permanent[];
  definitionOverrides?: Map<string, Partial<CardDefinition>>;
}): EffectContext {
  const { recorder, ownerBattleArea = [], opponentBattleArea = [], definitionOverrides } = opts;

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
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => [...ownerBattleArea, ...opponentBattleArea].find((p) => p.permanentId === id),
    definitionOf: (card) => {
      const over = definitionOverrides?.get(card.cardId) ?? {};
      return fakeDefinition({ cardId: card.cardId, ...over });
    },
  };

  const fx: Primitives = {
    // Only the verbs the tested clauses reach get real bodies;
    // everything else throws so accidental dispatch surfaces loudly.
    grantKeyword: record("grantKeyword"),
    restrict: record("restrict"),
    restrictAttackTarget: record("restrictAttackTarget"),
    disableTimingEffect: record("disableTimingEffect"),
    draw: () => { throw new Error("unexpected draw"); },
    gainMemory: () => { throw new Error("unexpected gainMemory"); },
    gainMemoryForSeat: () => { throw new Error("unexpected gainMemoryForSeat"); },
    restrictMemoryGain: () => { throw new Error("unexpected restrictMemoryGain"); },
    restrictCostReduction: () => { throw new Error("unexpected restrictCostReduction"); },
    declareWinner: () => { throw new Error("unexpected declareWinner"); },
    setMemory: () => { throw new Error("unexpected setMemory"); },
    modifyDP: () => { throw new Error("unexpected modifyDP"); },
    playFromHand: () => { throw new Error("unexpected playFromHand"); },
    playFromSecurity: () => { throw new Error("unexpected playFromSecurity"); },
    playInstances: () => { throw new Error("unexpected playInstances"); },
    digivolveFromInstance: () => { throw new Error("unexpected digivolveFromInstance"); },
    dnaDigivolveInto: () => { throw new Error("unexpected dnaDigivolveInto"); },
    deDigivolve: () => { throw new Error("unexpected deDigivolve"); },
    placeUnder: () => { throw new Error("unexpected placeUnder"); },
    relocatePermanent: () => { throw new Error("unexpected relocatePermanent"); },
    link: () => { throw new Error("unexpected link"); },
    trash: () => { throw new Error("unexpected trash"); },
    trashFromSecurity: () => { throw new Error("unexpected trashFromSecurity"); },
    deletePermanent: () => { throw new Error("unexpected deletePermanent"); },
    suspend: () => { throw new Error("unexpected suspend"); },
    unsuspend: () => { throw new Error("unexpected unsuspend"); },
    returnToHand: () => { throw new Error("unexpected returnToHand"); },
    returnToDeck: () => { throw new Error("unexpected returnToDeck"); },
    reveal: () => { throw new Error("unexpected reveal"); },
    searchDeck: () => { throw new Error("unexpected searchDeck"); },
    addSecurity: () => { throw new Error("unexpected addSecurity"); },
    grantPierce: () => { throw new Error("unexpected grantPierce"); },
    changeEvoCost: () => { throw new Error("unexpected changeEvoCost"); },
    changePlayCost: () => { throw new Error("unexpected changePlayCost"); },
    grantNameTrait: () => { throw new Error("unexpected grantNameTrait"); },
    waiveColorRequirement: () => { throw new Error("unexpected waiveColorRequirement"); },
    shuffleSecurity: () => { throw new Error("unexpected shuffleSecurity"); },
    securityToHand: () => { throw new Error("unexpected securityToHand"); },
    recoverToSecurity: () => { throw new Error("unexpected recoverToSecurity"); },
    forceAttack: () => { throw new Error("unexpected forceAttack"); },
    redirectAttack: () => { throw new Error("unexpected redirectAttack"); },
    subscribeSubTrigger: () => { throw new Error("unexpected subscribeSubTrigger"); },
    subscribeReplacement: () => { throw new Error("unexpected subscribeReplacement"); },
    conferStackEffects: () => { throw new Error("unexpected conferStackEffects"); },
    playToken: () => { throw new Error("unexpected playToken"); },
    modifySecurityDp: () => { throw new Error("unexpected modifySecurityDp"); },
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

describe("BT10-042 (Venusmon)", () => {
  const module = getEffectModule("BT10-042");

  it("is registered", () => {
    // Basic smoke-test: the import side-effect must register the module.
    expect(module, "BT10-042 must self-register on import").toBeDefined();
  });

  it("routes [When Digivolving] to WhenDigivolving timing only", () => {
    // The [When Digivolving] clause fires at WhenDigivolving, not at Static (None).
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[When Digivolving] calls grantKeyword SecurityAttack -1 on every opponent Digimon until opponent turn end", async () => {
    // Q1965: the effect grants SecurityAttack -1 to ALL opponent Digimon at WhenDigivolving.
    // Duration per printed text and documented behavior ChangeDigimonSAttackPlayerEffect(UntilOpponentTurnEnd).
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const opponentDigimon = [
      makePermanent("opp-p1", 1, "BT1-010"),
      makePermanent("opp-p2", 1, "BT1-011"),
    ];
    const recorder: Recorder = { calls: [] };
    // Venusmon itself is the source permanent on owner's side (seat 0);
    // two opponent Digimon on seat 1.
    const venusmonPermanent = makePermanent("self-p1", 0, "BT10-042");
    const ctx = makeContext({
      recorder,
      ownerBattleArea: [venusmonPermanent],
      opponentBattleArea: opponentDigimon,
    });
    // Override source to reference the self permanent (needed for youHave condition resolution).
    const sourceWithPermanent = makeSource({ permanent: () => venusmonPermanent });
    const ctxWithSource = { ...ctx, source: sourceWithPermanent };

    await effects[0]!.resolve(ctxWithSource);

    const kwCalls = recorder.calls.filter((c) => c.verb === "grantKeyword");
    // Both opponent Digimon should receive SecurityAttack with amount -1.
    expect(kwCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of kwCalls) {
      expect(call.args[1]).toBe("SecurityAttack");
      expect(call.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
      expect(call.args[3]).toBe(-1);
    }
  });

  it(
    "[Opponent's Turn] Static restrict must target ONLY Digimon with SecurityAttack, not all opponent Digimon",
    async () => {
      // Q1965: "Digimon with <Security Attack>" = only those affected by SA+ or SA-.
      // Q1966: even +1/-1 combo still "has" SecurityAttack and is restricted.
      // documented behavior L58-62: AttackerCondition gates on permanent.HasSecurityAttackChanges;
      //   a Digimon without SecurityAttack changes is NOT in the restricted set.
      //
      // The hand-fixed IR adds a keywords:["SecurityAttack"] filter to the restrict
      // target, so a Digimon without SecurityAttack (printed or granted) is not in the
      // restricted set.
      const source = makeSource();
      const staticEffects = module!.effectsForTiming(EffectTiming.None, source);
      expect(staticEffects.length).toBeGreaterThanOrEqual(1);

      // Opponent has ONE Digimon with NO SecurityAttack in its text/effects.
      const plainDigimon = makePermanent("opp-plain", 1, "BT1-001");

      const recorder: Recorder = { calls: [] };
      const venusmonPermanent = makePermanent("self-v", 0, "BT10-042");
      const ctx = makeContext({
        recorder,
        ownerBattleArea: [venusmonPermanent],
        opponentBattleArea: [plainDigimon],
      });
      const ctxWithSource = { ...ctx, source: makeSource({ permanent: () => venusmonPermanent }) };

      for (const effect of staticEffects) {
        await effect.resolve(ctxWithSource);
      }

      // KB-correct: restrict() should NOT be called for a Digimon without SecurityAttack.
      // Today the IR calls restrict() for ALL opponent Digimon, so this assertion fails.
      const restrictCalls = recorder.calls.filter((c) => c.verb === "restrict");
      expect(restrictCalls).toHaveLength(0);
    },
  );

  it("scopes the attack prohibition to Venusmon itself instead of disabling every attack", async () => {
    const affected = makePermanent("opp-security-attack", 1, "BT10-013");
    const venusmon = makePermanent("self-venusmon", 0, "BT10-042");
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      ownerBattleArea: [venusmon],
      opponentBattleArea: [affected],
      definitionOverrides: new Map([["BT10-013", {
        effectText: "＜Security Attack +1＞",
      }]]),
    });
    const staticEffects = module!.effectsForTiming(EffectTiming.None, makeSource());

    for (const effect of staticEffects) {
      await effect.resolve({
        ...ctx,
        source: makeSource({ permanent: () => venusmon }),
      });
    }

    const scoped = recorder.calls.filter(({ verb }) => verb === "restrictAttackTarget");
    expect(scoped).toHaveLength(1);
    expect(scoped[0]!.args.slice(0, 2)).toEqual([
      affected.permanentId,
      venusmon.permanentId,
    ]);
    expect(recorder.calls.filter(({ verb }) => verb === "restrict")).toHaveLength(0);
  });
});
