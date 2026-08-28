import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../effects/registry.js";
import type { CardSource } from "../effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../effects/EffectContext.js";
// Side-effect import: register the hand-written EX3-036 override.
import "../../cards/EX3/EX3-036.js";

// IR-02 Tier-3 A3 for PlaceInBattleAreaSelf (option-permanent placement) — the BUILT path.
//
// The engine's `playInstances` plays only permanent kinds (isPermanentKind excludes Option), so
// "place 1 [Trial of the Four Great Dragons] from your hand in your battle area" was silently
// skipped (EX3-036 carried a `place-option-as-permanent` missing-primitive flag). The new
// `placeOptionAsPermanent` primitive places an Option as a battle-area permanent; EX3-036's
// hand-written [On Deletion] clause drives it. This A3 proves the place happens (and is gated),
// with a fails-when-reverted lever.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 1,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(permanentId: string, seat: Seat, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

interface HandCard {
  instanceId: string;
  cardId: string;
  ownerSeat: Seat;
}

function makeContext(opts: {
  recorder: Recorder;
  ownerHand?: HandCard[];
  ownerBattleArea?: Permanent[];
  definitionOverrides?: Map<string, Partial<CardDefinition>>;
  optionalAnswer?: boolean;
}): EffectContext {
  const { recorder, ownerHand = [], ownerBattleArea = [], definitionOverrides, optionalAnswer = true } = opts;

  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, security: [], hand: ownerHand, deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const definitionOf = (card: { cardId: string }): CardDefinition => {
    const over = definitionOverrides?.get(card.cardId) ?? {};
    return fakeDefinition({ cardId: card.cardId, nameEn: card.cardId, ...over });
  };

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) => ownerBattleArea.find((p) => p.permanentId === id),
    definitionOf,
  } as unknown as GameAccess;

  const fx = {
    grantKeyword: (...args: unknown[]) => {
      recorder.calls.push({ verb: "grantKeyword", args });
    },
    placeOptionAsPermanent: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "placeOptionAsPermanent", args });
      return undefined as never;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => optionalAnswer,
    chooseTargets: async (_c: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
    selectCards: async (_c: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  } as unknown as DecisionApi;

  const source = {
    instanceId: "INST#ex3-036",
    cardId: "EX3-036",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition({ cardId: "EX3-036" }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as unknown as CardSource;

  return { source, trigger: {}, game, fx, ask, selections: new Map<string, string>() } as unknown as EffectContext;
}

const trialName = "Trial of the Four Great Dragons";

describe("Tier-3 A3 — PlaceInBattleAreaSelf (EX3-036 places a [Trial] Option as a permanent)", () => {
  const module = getEffectModule("EX3-036");

  it("is registered (hand-written override)", () => {
    expect(module, "EX3-036 must self-register on import").toBeDefined();
  });

  it("[On Deletion] places a [Trial of the Four Great Dragons] from hand as a battle-area permanent", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      ownerHand: [{ instanceId: "trial-1", cardId: "EX3-069", ownerSeat: 0 as Seat }],
      definitionOverrides: new Map([["EX3-069", { nameEn: trialName, kinds: ["Option"] as never }]]),
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, ctx.source);
    expect(effects.length, "an On Deletion place clause must exist").toBeGreaterThanOrEqual(1);
    for (const effect of effects) {
      expect(effect.canActivate(ctx), "with a [Trial] in hand and none in play -> activatable").toBe(true);
      await effect.resolve(ctx);
    }

    const placeCalls = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(placeCalls, "the [Trial] Option must be placed as a permanent").toHaveLength(1);
    expect(placeCalls[0]!.args[0]).toBe("trial-1");
  });

  it("REVERT-CONFIRM-RED: with a [Trial] already in play the [On Deletion] place is gated off", async () => {
    // The fails-when-reverted lever (the documented behavior CanActivate guard): if you already have a [Trial] in
    // play, the effect does NOT activate and nothing is placed (Q3412). A stubbed
    // placeOptionAsPermanent would likewise produce no observable placement.
    const recorder: Recorder = { calls: [] };
    const trialInPlay = makePermanent("trial-in-play", 0, "EX3-069");
    const ctx = makeContext({
      recorder,
      ownerHand: [{ instanceId: "trial-2", cardId: "EX3-069", ownerSeat: 0 as Seat }],
      ownerBattleArea: [trialInPlay],
      definitionOverrides: new Map([["EX3-069", { nameEn: trialName, kinds: ["Option"] as never }]]),
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, ctx.source);
    for (const effect of effects) {
      expect(effect.canActivate(ctx), "a [Trial] already in play -> not activatable").toBe(false);
      await effect.resolve(ctx);
    }

    expect(
      recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent"),
      "a [Trial] already in play -> no placement",
    ).toHaveLength(0);
  });

  it("exposes the errata's may at the effect boundary instead of nesting a second confirmation", () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      ownerHand: [{ instanceId: "trial-3", cardId: "EX3-069", ownerSeat: 0 as Seat }],
      definitionOverrides: new Map([["EX3-069", { nameEn: trialName, kinds: ["Option"] as never }]]),
      optionalAnswer: false,
    });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, ctx.source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.optional).toBe(true);
    expect(recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent")).toHaveLength(0);
  });
});
