import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../effects/registry.js";
import type { CardSource } from "../effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../effects/EffectContext.js";
// Import side effects: register the cluster's IR card modules.
import "../../cards/BT12/BT12-040.js";
import "../../cards/EX5/EX5-054.js";

// Per-cluster A3 for the cost-modification RawUnparsed batch (plan 04-10 / CARD-01).
//
// Authored faithfully (this file proves them):
//   BT12-040 Sagomon  — [Static] When you would play this from hand, if your opponent has a
//     Digimon WITH <Security Attack> in play, reduce THIS card's play cost by 3.
//     KB Q2172: "Digimon with <Security Attack>" = Digimon affected by SA+/SA- (GRANTED),
//     so the gate reads the granted-keyword store, not only printed text.
//   EX5-054 MetalEtemon — [On Play]/[When Digivolving] delete 1 opponent Digimon/Tamer whose
//     play cost is <= 3 + (# of [Etemon]/[Sukamon]-named cards in YOUR trash). The cap scales
//     at runtime (Filter.playCostLteScaling).
//
// Flagged missing-primitive (NOT proven here; honestly inert in the IR — see SUMMARY):
//   BT25-004 link-cost reduction (engine <Link> is costless),
//   BT25-076 sacrifice-cost reduction (dynamic pay-time delta),
//   EX9-043 trash-gated interactive play-cost reduction.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT12-040",
    set: "BT12",
    nameEn: "Sagomon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 6,
    dp: 7000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(permanentId: string, seat: Seat, cardId: string): Permanent {
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
    instanceId: "INST#cost",
    cardId: "BT12-040",
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
  ownerTrash?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  definitionOverrides?: Map<string, Partial<CardDefinition>>;
  grantedByPermanent?: Map<string, { keyword: string; amount?: number }[]>;
  sourceCardId?: string;
}): EffectContext {
  const {
    recorder,
    ownerBattleArea = [],
    opponentBattleArea = [],
    ownerTrash = [],
    definitionOverrides,
    grantedByPermanent,
    sourceCardId = "BT12-040",
  } = opts;

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, security: [], hand: [], deck: [], trash: ownerTrash },
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
    hasKeyword: (permanentId: string, keyword: string) =>
      (grantedByPermanent?.get(permanentId) ?? []).some((entry) => entry.keyword === keyword),
  } as unknown as GameAccess;

  const fx: Primitives = {
    changePlayCost: record("changePlayCost"),
    deletePermanent: record("deletePermanent"),
    grantedKeywords: (permanentId: string) => grantedByPermanent?.get(permanentId) ?? [],
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
    source: makeSource({ cardId: sourceCardId, definition: fakeDefinition({ cardId: sourceCardId }) }),
    trigger: {},
    game,
    fx,
    ask,
  } as unknown as EffectContext;
}

// ---------------------------------------------------------------------------
// BT12-040 — conditional self play-cost reduction (A3)
// ---------------------------------------------------------------------------

describe("cost-modification cluster A3 — BT12-040 conditional self play-cost -3", () => {
  const module = getEffectModule("BT12-040");

  it("is registered", () => {
    expect(module, "BT12-040 must self-register on import").toBeDefined();
  });

  it("the play-cost reducer lives at the pay-time window", () => {
    // "When you would play this card from your hand … reduce its play cost by 3" is the
    // pay-time window (BeforePayCost), not a board-wide Static modifier.
    const effects = module!.effectsForTiming(EffectTiming.BeforePayCost, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("reduces this card's play cost by 3 ONLY when an opponent Digimon has GRANTED <Security Attack>", async () => {
    const selfPermanent = makePermanent("self-sago", 0, "BT12-040");
    const oppDigimon = makePermanent("opp-sa", 1, "BT1-010");

    // KB Q2172: the opponent Digimon "has <Security Attack>" because it was GRANTED SA+,
    // not because its printed text declares it (its definition text is empty here).
    const granted = new Map<string, { keyword: string; amount?: number }[]>([
      ["opp-sa", [{ keyword: "SecurityAttack", amount: 1 }]],
    ]);

    const recorder: Recorder = { calls: [] };
    const ctx = {
      ...makeContext({
        recorder,
        ownerBattleArea: [selfPermanent],
        opponentBattleArea: [oppDigimon],
        grantedByPermanent: granted,
      }),
      source: makeSource({ permanent: () => selfPermanent }),
    } as EffectContext;

    const effects = module!.effectsForTiming(EffectTiming.BeforePayCost, ctx.source);
    expect(effects.length, "the conditional self-cost reducer must be installed").toBe(1);
    const reducer = effects[0]!;
    expect(reducer.canTrigger?.(ctx) ?? true, "the SA condition must hold").toBe(true);
    await reducer.resolve(ctx);

    // `playCostDelta` is the reduction the play action subtracts: max(0, cost - delta).
    expect(ctx.playCostDelta).toBe(3);
  });

  it("REVERT-CONFIRM-RED: with NO opponent <Security Attack> Digimon, the reducer is NOT installed", async () => {
    // The fails-when-reverted lever: the discount is gated on the opponentHas-SA condition.
    // Remove the granted SA (or the condition) and changePlayCost must NOT be called — a
    // free unconditional discount would be a memory-integrity violation (threat T-04-16).
    const selfPermanent = makePermanent("self-sago", 0, "BT12-040");
    const oppPlain = makePermanent("opp-plain", 1, "BT1-001"); // no granted SA, no printed SA

    const recorder: Recorder = { calls: [] };
    const ctx = {
      ...makeContext({
        recorder,
        ownerBattleArea: [selfPermanent],
        opponentBattleArea: [oppPlain],
        grantedByPermanent: new Map(), // nothing granted
      }),
      source: makeSource({ permanent: () => selfPermanent }),
    } as EffectContext;

    const effects = module!.effectsForTiming(EffectTiming.BeforePayCost, ctx.source);
    for (const effect of effects) {
      expect(effect.canTrigger?.(ctx) ?? true, "no discount may apply without the SA condition").toBe(false);
    }

    expect(ctx.playCostDelta, "no discount may apply without the SA condition").toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// EX5-054 — delete with a runtime-scaled play-cost cap (A3)
// ---------------------------------------------------------------------------

describe("cost-modification cluster A3 — EX5-054 scaled delete cap", () => {
  const module = getEffectModule("EX5-054");

  it("is registered", () => {
    expect(module, "EX5-054 must self-register on import").toBeDefined();
  });

  it("deletes an opponent cost-5 Digimon when 2 [Etemon]/[Sukamon] cards sit in trash (cap 3 + 2 = 5)", async () => {
    // Cap = base 3 + (# of [Etemon]/[Sukamon] names in OWN trash). Two such cards -> cap 5,
    // so a printed-cost-5 opponent Digimon is a legal delete target.
    const oppCost5 = makePermanent("opp-c5", 1, "BT1-020");
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      opponentBattleArea: [oppCost5],
      ownerTrash: [
        { instanceId: "t1", cardId: "EX5-053", ownerSeat: 0 as Seat },
        { instanceId: "t2", cardId: "EX5-055", ownerSeat: 0 as Seat },
      ],
      definitionOverrides: new Map([
        ["BT1-020", { playCost: 5, nameEn: "Target", kinds: ["Digimon"] as never }],
        ["EX5-053", { nameEn: "Etemon", kinds: ["Digimon"] as never }],
        ["EX5-055", { nameEn: "Sukamon", kinds: ["Digimon"] as never }],
      ]),
      sourceCardId: "EX5-054",
    });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, ctx.source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    for (const effect of effects) await effect.resolve(ctx);

    expect(
      recorder.calls.some((c) => c.verb === "deletePermanent"),
      "a cost-5 opponent Digimon must be deletable when the trash raised the cap to 5",
    ).toBe(true);
  });

  it("REVERT-CONFIRM-RED: with an EMPTY trash the cap stays 3, so a cost-5 Digimon is NOT a legal target", async () => {
    // The fails-when-reverted lever: drop playCostLteScaling (or empty the trash) and the cap
    // falls to the printed base 3 -> the cost-5 candidate no longer matches -> no delete.
    const oppCost5 = makePermanent("opp-c5", 1, "BT1-020");
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      opponentBattleArea: [oppCost5],
      ownerTrash: [], // empty -> cap stays at base 3
      definitionOverrides: new Map([["BT1-020", { playCost: 5, nameEn: "Target", kinds: ["Digimon"] as never }]]),
      sourceCardId: "EX5-054",
    });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, ctx.source);
    for (const effect of effects) await effect.resolve(ctx);

    expect(
      recorder.calls.some((c) => c.verb === "deletePermanent"),
      "a cost-5 Digimon must NOT be deletable when the cap is the base 3",
    ).toBe(false);
  });
});
