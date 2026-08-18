import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-112.js";

// BT7-112 (Susanoomon)
// Chosen KB clauses:
//   1. [When Digivolving] "Delete 1 of your opponent's Digimon" — fires ONLY at
//      WhenDigivolving; targets exactly 1 opponent Digimon.
//      Q2048: the inherited effect does NOT activate when this card is trashed by the
//      rules instead of digivolving, confirming the trigger is WhenDigivolving not OnPlay.
//   2. The condition gate for the Delete effect uses "youHave" (mine-side) in the IR,
//      IsPermanentExistsOnOpponentBattleAreaDigimon. The interpreter's evaluateCondition
//      for "youHave" overrides the filter controller to "mine", so the gate always fails
//      when the controller has no Digimon. This is a runtime record IR bug.
//   3. The first effect (return 10 Tamer/Hybrid cards to unlock Tamer digivolution) is
//      mis-modelled as Replacement/reduceCost in the IR. Q1681/Q1684 confirm it is a
//      gated alternate digivolution path, not a cost reduction.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT7-112",
    set: "BT7",
    nameEn: "Susanoomon",
    kinds: ["Digimon"] as never,
    colors: ["White"] as never,
    playCost: 15,
    dp: 15000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeInstance(instanceId: string, cardId: string, ownerSeat: Seat): CardInstance {
  return { instanceId, cardId, ownerSeat } as unknown as CardInstance;
}

function makeOpponentDigimon(permanentId: string, controllerSeat: Seat = 1 as Seat): Permanent {
  return {
    permanentId,
    controllerSeat,
    topCard: fakeInstance(`${permanentId}-top`, "BT1-001", controllerSeat),
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(opts: { isOnBattleArea?: boolean } = {}): CardSource {
  return {
    instanceId: "INST#BT7-112",
    cardId: "BT7-112",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => opts.isOnBattleArea ?? true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: {
  recorder: Recorder;
  opponentDigimon?: Permanent[];
}): EffectContext {
  const players = [
    { seat: 0, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opts.opponentDigimon ?? [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 } as unknown as GameState;
  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => {
      for (const p of players) {
        const found = (p.battleArea as Permanent[]).find((x) => x.permanentId === id);
        if (found) return found;
      }
      return undefined;
    },
    definitionOf: (card) => fakeDefinition({ cardId: card.cardId }),
  };
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };
  // Only the verbs the Delete clause can reach need real bodies; everything else throws
  // so accidental dispatch surfaces immediately.
  const fx = {
    deletePermanent: record("deletePermanent"),
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: makeSource({ isOnBattleArea: true }), trigger: {}, game, fx, ask };
}

describe("BT7-112 (Susanoomon)", () => {
  const module = getEffectModule("BT7-112");

  it("is registered", () => {
    expect(module, "BT7-112 must self-register on import").toBeDefined();
  });

  it("routes [When Digivolving] delete to WhenDigivolving, not to OnPlay", () => {
    // Q2048: the When Digivolving delete only fires during an actual digivolution;
    // when BT7-112 is trashed by rules (not an effect), this timing never fires.
    // Wrong timing windows must return no effect for this clause.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it(
    "[When Digivolving] deletes 1 opponent Digimon when one is available",
    async () => {
      // Q1684: the effect fires when there is an opponent Digimon to target; the documented behavior
      // coroutine calls Destroy. Now PASSES: the IR override gates the Delete with
      // kind:"opponentHas" (was the runtime record's contradictory kind:"youHave" +
      // controller:"opponent", which evaluateCondition collapsed to controller:"mine").
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
      const deleteEffect = effects.find((e) => e.description.includes("Delete"));
      expect(deleteEffect, "WhenDigivolving Delete effect must exist").toBeDefined();
      const recorder: Recorder = { calls: [] };
      const opponentDigimon = [makeOpponentDigimon("PERM#OPP-1")];
      const ctx = makeContext({ recorder, opponentDigimon });
      await deleteEffect!.resolve(ctx);
      const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
      expect(deleteCalls).toHaveLength(1);
      expect((deleteCalls[0]!.args[0] as string[])).toContain("PERM#OPP-1");
    },
  );

  it(
    "[When Digivolving] deletes exactly 1 (not 2) when opponent has multiple Digimon",
    async () => {
      // The effect card text says "Delete 1" — exactly 1. Now PASSES with the
      // kind:"opponentHas" gate fix (same root cause as above).
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
      const deleteEffect = effects.find((e) => e.description.includes("Delete"));
      expect(deleteEffect).toBeDefined();
      const recorder: Recorder = { calls: [] };
      const opponentDigimon = [makeOpponentDigimon("PERM#OPP-1"), makeOpponentDigimon("PERM#OPP-2")];
      const ctx = makeContext({ recorder, opponentDigimon });
      await deleteEffect!.resolve(ctx);
      const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
      expect(deleteCalls).toHaveLength(1);
      // Exactly one permanent id was passed.
      expect((deleteCalls[0]!.args[0] as string[])).toHaveLength(1);
    },
  );

  it(
    "[Static] first clause should be an alternate digivolution path, not a cost reduction",
    async () => {
      // Q1681, Q1684: the first effect is a gated ALTERNATE digivolution path
      // (return 10 Tamer/Hybrid cards unlocks digivolving from a Tamer treated as Lv6).
      // The runtime record incorrectly modelled this as Replacement/reduceCost:"wouldDigivolve"
      // at Static timing. The hand-fixed IR removes that wrong Replacement action; the
      // alternate path is represented by `digivolutionRequirement: [{ isAlternate: true }]`.
      // The assertion below checks that there is NO Replacement action in the Static
      // (None) effects.
      const source = makeSource();
      const noneEffects = module!.effectsForTiming(EffectTiming.None, source);
      // A correct port has NO Replacement at None (only SecurityAttack keyword grant).
      const hasReplacementAtNone = noneEffects.some((e) =>
        e.description.toLowerCase().includes("replacement"),
      );
      expect(hasReplacementAtNone).toBe(false);
    },
  );

  it("uses five hand and five trash Hybrids to evolve a Tamer and check three security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [
            { card: "BT7-112", as: "susanoomon" },
            "BT4-011",
            "BT4-025",
            "BT7-021",
            "BT7-038",
            "BT7-046",
          ],
          trash: ["BT4-011", "BT4-025", "BT7-021", "BT7-038", "BT7-046"],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "deleted" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("susanoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard.cardId === "BT7-112" &&
        s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(10);
    expect(observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack")).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 5000);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
