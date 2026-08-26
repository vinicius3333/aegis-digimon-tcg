import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
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
  oppDeck?: { instanceId: string; cardId: string; ownerSeat: Seat; faceUp?: boolean }[];
  sourcePermanent?: { permanentId: string; topCard: { instanceId: string; cardId: string; ownerSeat: Seat } };
  chooseOptionIndexes?: number[];
}

function makeContext(opts: ContextOpts): EffectContext {
  const ownerSeat = 0 as Seat;
  const oppSeat = 1 as Seat;
  const ownerBattleArea = opts.ownerBattleArea ?? [];
  const oppSecurity = opts.oppSecurity ?? [];
  const oppDeck = opts.oppDeck ?? [];

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
      deck: oppDeck,
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
    reveal: async (seat: Seat, count: number) => {
      const revealed = players[seat]!.deck.slice(0, count);
      opts.recorder.calls.push({ verb: "reveal", args: [seat, count] });
      return revealed as never;
    },
    restrict: record("restrict"),
    returnToDeck: record("returnToDeck"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => opts.chooseOptionIndexes?.shift() ?? 0,
  };

  const source = makeSource({
    permanent: () => opts.sourcePermanent as never,
    isOnBattleArea: () => true,
  });

  return { source, trigger: {}, game, fx, ask };
}

describe("LM-020 Quantumon", () => {
  it("registers complete security-exchange and category-immunity IR", () => {
    const compiled = runtimeCompiledCard("LM-020")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "SecurityManipulation", op: "placeAsSecurity", optional: true },
        { kind: "SecurityManipulation", op: "revealAllChooseToDeckTopShuffleRest", controller: "opponent" },
      ],
    });
    // No [Once Per Turn] is printed on the When Digivolving clause.
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.frequency).toBeUndefined();
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfOpponentsTurn")?.actions).toEqual([
      expect.objectContaining({ kind: "DeclareCategoryImmunity", duration: "forTheTurn" }),
    ]);
  });

  it("publicly digivolves Quantumon and places an owned Digimon into security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-036", as: "base" },
            { card: "LM-016", as: "fodder" },
          ],
          hand: [{ card: "LM-020", as: "quantumon" }],
        },
        1: { security: ["BT1-001", "BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.some((card) => card.cardId === "LM-020") &&
        s.state.players[1]!.security.length === 1 &&
        s.state.players[1]!.deck.length === 1,
    );
    expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-020")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-020")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("still places the chosen Digimon when the opponent has no security cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-036", as: "base" }], hand: [{ card: "LM-020", as: "quantumon" }] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "LM-020"));
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "LM-020")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
  it("places a chosen opposing Digimon into that opponent's own security stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-036", as: "base" }], hand: [{ card: "LM-020", as: "quantumon" }] },
        1: { battleArea: [{ card: "LM-016", as: "theirs" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("theirs").permanentId);
    s.state.memory = 10;

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("quantumon").instanceId,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    // The Digimon lands in ITS OWNER's stack, never the resolving player's. The second half of
    // the clause then moves one of that stack's cards onto the same player's deck, so the card
    // ends up in one of those two zones — both belonging to its owner.
    expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-016")).toBe(false);
    expect(
      s.state.players[1]!.security.some((card) => card.cardId === "LM-016") ||
        s.state.players[1]!.deck.some((card) => card.cardId === "LM-016"),
    ).toBe(true);
  });

  const module = getEffectModule("LM-020");

  it("is registered", () => {
    // Basic smoke test — the import side-effect must register the module.
    expect(module, "LM-020 must self-register on import").toBeDefined();
  });

  // Q4003: [Start of Opponent's Turn] fires at the START of the OPPONENT's turn.
  // The engine models that as the opponent's OnStartTurn window. The IR trigger
  // "StartOfOpponentsTurn" must map to EffectTiming.OnStartTurn, not to None.
  // Now PASSES: timingForTrigger() maps "StartOfOpponentsTurn" -> EffectTiming.OnStartTurn
  // and the turn-ownership guard restricts it to the opponent's turn.
  it("StartOfOpponentsTurn clause produces at least one effect at OnStartTurn timing", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

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
  // Now PASSES: the IR override encodes the "place 1 Digimon to security" cost as
  // SecurityManipulation{op:"placeAsSecurity", controller:"mine", source: a battle-area
  // Digimon}, which resolves the Digimon's top card and dispatches addSecurity.
  it("WhenDigivolving: resolving the effect calls addSecurity (place Digimon to security), not trashFromSecurity", async () => {
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
  });

  it("declares a matching category, grants only that category immunity, and returns the revealed card to the bottom", async () => {
    const recorder: Recorder = { calls: [] };
    const quantumon = {
      permanentId: "PERM#quantumon",
      topCard: { instanceId: "INST#quantumon", cardId: "LM-020", ownerSeat: 0 as Seat },
    };
    const ctx = makeContext({
      recorder,
      ownerBattleArea: [quantumon],
      sourcePermanent: quantumon,
      oppDeck: [
        { instanceId: "INST#top", cardId: "BT1-001", ownerSeat: 1 as Seat },
        { instanceId: "INST#tail", cardId: "BT1-085", ownerSeat: 1 as Seat },
      ],
      // Digimon, then return the revealed card to the bottom.
      chooseOptionIndexes: [0, 1],
    });

    const effect = module!.effectsForTiming(EffectTiming.OnStartTurn, ctx.source)[0]!;
    await effect.resolve(ctx);

    expect(recorder.calls).toContainEqual(
      expect.objectContaining({
        verb: "restrict",
        args: expect.arrayContaining(["PERM#quantumon", "beAffected", expect.anything(), { fromSourceKind: ["Digimon"] }]),
      }),
    );
    expect(ctx.game.player(1).deck.map((card) => card.instanceId)).toEqual(["INST#tail", "INST#top"]);
  });
});
