import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./LM-020.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

// LM-020 (Quantumon) — two clauses with dense official Q&A:
//
//  [When Digivolving] By placing 1 Digimon on top of its owner's security stack,
//  reveal all of your opponent's security cards, place 1 among them on top of your
//  opponent's deck, then shuffle the rest back.
//
//  [Start of Opponent's Turn] Declare 1 card category. Reveal the top card of your
//  opponent's deck. If it matches, this Digimon isn't affected by that category for
//  the turn. Return the revealed card to top or bottom of opponent's deck.
//  (Q4003 notes this text was errata'd to include the "top or bottom" return choice.)
//
// The KB reveals two IR defects tested here:
//  1. WhenDigivolving IR uses SecurityManipulation.trashTop (trash opponent security)
//     instead of addSecurity / placeAsSecurity (place a Digimon to security). These
//     are structurally different verbs — the correct verb is addSecurity.
//  2. StartOfOpponentsTurn IR trigger maps to EffectTiming.None in timingForTrigger(),
//     so effectsForTiming(OnStartTurn) returns 0. The clause fires on the OPPONENT's
//     turn-start, which the engine models as the opponent's OnStartTurn window. The
//     trigger should have been mapped to that window, not to None.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "LM-020",
    set: "LM",
    nameEn: "Quantumon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow", "Green"] as never,
    playCost: 13,
    dp: 13000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#LM020",
    cardId: "LM-020",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => false, // this triggers on opponent's turn
    hasColor: () => false,
    ...over,
  };
}

interface ContextOpts {
  recorder: Recorder;
  turnSeat?: Seat;
  ownerBattleArea?: { permanentId: string; topCard: { instanceId: string; cardId: string; ownerSeat: Seat } }[];
  oppSecurity?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
}

function makeContext(opts: ContextOpts): EffectContext {
  const ownerSeat = 0 as Seat;
  const oppSeat = 1 as Seat;
  const ownerBattleArea = opts.ownerBattleArea ?? [];
  const oppSecurity = opts.oppSecurity ?? [];

  const players = [
    {
      seat: ownerSeat,
      battleArea: ownerBattleArea,
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
    {
      seat: oppSeat,
      battleArea: [],
      security: oppSecurity,
      hand: [],
      deck: [],
      trash: [],
    },
  ];

  const state = {
    memory: 0,
    players,
    turnSeat: opts.turnSeat ?? (1 as Seat),
  } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => {
      for (const p of [...players[0]!.battleArea, ...players[1]!.battleArea]) {
        if ((p as { permanentId: string }).permanentId === id) return p as never;
      }
      return undefined;
    },
    definitionOf: (card: { cardId: string }) => fakeDefinition({ cardId: card.cardId }),
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };

  // Only the verbs the tested clauses can actually reach need real bodies.
  // Everything else throws on contact so accidental dispatch surfaces immediately.
  const fx = {
    addSecurity: record("addSecurity"),
    trashFromSecurity: record("trashFromSecurity"),
    shuffleSecurity: record("shuffleSecurity"),
    reveal: async (...args: unknown[]) => {
      opts.recorder.calls.push({ verb: "reveal", args });
      return [] as never;
    },
    restrict: record("restrict"),
    returnToDeck: record("returnToDeck"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const source = makeSource({
    permanent: () => undefined,
    isOnBattleArea: () => true,
  });

  return { source, trigger: {}, game, fx, ask };
}

describe("LM-020 Quantumon", () => {
  it("publicly digivolves Quantumon and places an owned Digimon into security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-036", as: "base" }, { card: "LM-016", as: "fodder" }], hand: [{ card: "LM-020", as: "quantumon" }] },
      1: { security: ["BT1-001", "BT1-085"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("quantumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "LM-020"));
    expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-020")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-020")).toBe(false);
  });

  it("still places the chosen Digimon when the opponent has no security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-036", as: "base" }], hand: [{ card: "LM-020", as: "quantumon" }] },
      1: { security: [] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("quantumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "LM-020"));
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "LM-020")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
  const module = getEffectModule("LM-020");

  it("is registered", () => {
    // Basic smoke test — the import side-effect must register the module.
    expect(module, "LM-020 must self-register on import").toBeDefined();
  });

  // Q4003: [Start of Opponent's Turn] fires at the START of the OPPONENT's turn.
  // The engine models that as the opponent's OnStartTurn window. The IR trigger
  // "StartOfOpponentsTurn" must map to EffectTiming.OnStartTurn, not to None.
  it(
    "StartOfOpponentsTurn clause produces at least one effect at OnStartTurn timing",
    // Now PASSES: timingForTrigger() maps "StartOfOpponentsTurn" -> EffectTiming.OnStartTurn
    // and the turn-ownership guard restricts it to the opponent's turn (the engine models the
    // opponent's turn-start as the opponent's OnStartTurn window).
    () => {
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
      expect(effects.length).toBeGreaterThanOrEqual(1);
    },
  );

  // Q4003: No effect fires at WhenDigivolving for the Start-of-Opponent's-Turn clause —
  // wrong-timing sanity check (a separate guard from the main xfail above).
  it("WhenDigivolving timing has at least one effect (the digivolving clause)", () => {
    // Q4008/Q4009: the WhenDigivolving effect is real and fire-able; it must exist there.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  // Q4008: "By placing 1 Digimon on top of its owner's security stack" — the cost
  // of the WhenDigivolving effect is ADDING a Digimon to security (addSecurity /
  // SecurityManipulation.placeAsSecurity), NOT trashing security (trashTop). The
  // IR incorrectly encodes this as SecurityManipulation.trashTop on the opponent.
  it(
    "WhenDigivolving: resolving the effect calls addSecurity (place Digimon to security), not trashFromSecurity",
    // Now PASSES: the IR override encodes the "place 1 Digimon to security" cost as
    // SecurityManipulation{op:"placeAsSecurity", controller:"mine", source: a battle-area
    // Digimon}, which resolves the Digimon's top card and dispatches addSecurity.
    async () => {
      const recorder: Recorder = { calls: [] };
      // Provide one own battle-area Digimon so the effect has a candidate to place.
      const ownDigimon = {
        permanentId: "PERM#own1",
        isSuspended: false,
        currentDP: 5000,
        stack: [],
        topCard: { instanceId: "INST#own1", cardId: "LM-001", ownerSeat: 0 as Seat },
      };
      const ctx = makeContext({
        recorder,
        turnSeat: 0 as Seat, // owner's turn (when digivolving)
        ownerBattleArea: [ownDigimon],
        oppSecurity: [],
      });

      const source = makeSource({
        isOnBattleArea: () => true,
        permanent: () => undefined,
      });
      const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
      expect(effects.length).toBeGreaterThanOrEqual(1);

      await effects[0]!.resolve(ctx);

      // The KB-correct call is addSecurity (place a Digimon onto security stack).
      // The IR wrongly calls trashFromSecurity instead.
      const addCalls = recorder.calls.filter((c) => c.verb === "addSecurity");
      expect(addCalls.length).toBeGreaterThanOrEqual(1);
    },
  );
});
