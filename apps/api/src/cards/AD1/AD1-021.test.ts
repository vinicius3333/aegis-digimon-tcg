import { describe, it, expect } from "vitest";
import { EffectTiming, CardKind, CardColor, type CardDefinition, type GameState, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./AD1-021.js";

// AD1-021 Marcus Damon & Agumon
// [End of Your Turn] [Once Per Turn] If you have a yellow Digimon with [Agumon] or
// [Greymon] in its name, for the turn, 1 of your [Marcus Damon]s is also treated as
// a 6000 DP Digimon, gains <Rush> and can't digivolve. Then, 1 of your Digimon may attack.
//
// KB sources: Q6101-Q6111 (2026-03-13/2026-05-08)

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeTamerDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "AD1-021",
    set: "AD1",
    nameEn: "Marcus Damon & Agumon",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Yellow],
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeMarcosDamonDefinition(): CardDefinition {
  return {
    cardId: "AD1-021",
    set: "AD1",
    nameEn: "Marcus Damon",
    kinds: [CardKind.Tamer],
    colors: [CardColor.Yellow],
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function fakeYellowAgumonDefinition(): CardDefinition {
  return {
    cardId: "BT1-010",
    set: "BT1",
    nameEn: "Agumon",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Yellow],
    playCost: 3,
    dp: 2000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#AD1-021",
    cardId: "AD1-021",
    ownerSeat: 0 as Seat,
    definition: fakeTamerDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Yellow,
    ...overrides,
  };
}

type BattleAreaEntry = {
  permanentId: string;
  topCard: { instanceId: string; cardId: string; ownerSeat: Seat };
  currentDP: number;
  isSuspended: boolean;
  stack: never[];
  linked?: never[];
};

function makePermanent(
  permanentId: string,
  definition: CardDefinition,
  currentDP = 0,
  isSuspended = false,
): BattleAreaEntry {
  return {
    permanentId,
    topCard: { instanceId: `INST#${permanentId}`, cardId: definition.cardId, ownerSeat: 0 as Seat },
    currentDP,
    isSuspended,
    stack: [],
  };
}

function makeContext(opts: {
  recorder: Recorder;
  seat0BattleArea?: BattleAreaEntry[];
  seat1BattleArea?: BattleAreaEntry[];
  definitionMap?: Map<string, CardDefinition>;
}): EffectContext {
  const seat0Area = opts.seat0BattleArea ?? [];
  const seat1Area = opts.seat1BattleArea ?? [];
  const defMap = opts.definitionMap ?? new Map<string, CardDefinition>();

  const players = [
    { seat: 0, battleArea: seat0Area, security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: seat1Area, security: [], hand: [], deck: [], trash: [] },
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
      return fakeTamerDefinition({ cardId: card.cardId });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const fx = {
    restrict: record("restrict"),
    grantKeyword: record("grantKeyword"),
    grantNameTrait: record("grantNameTrait"),
    grantKind: record("grantKind"),
    setBaseDP: record("setBaseDP"),
    modifyDP: record("modifyDP"),
    forceAttack: record("forceAttack"),
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

describe("AD1-021 Marcus Damon & Agumon", () => {
  const module = getEffectModule("AD1-021");

  it("plays from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "AD1-021", as: "securityMarcus", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMarcus"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("securityMarcus").instanceId)).toBe(true);
  });

  it("is registered", () => {
    expect(module, "AD1-021 must self-register on import").toBeDefined();
  });

  // Q6111: [End of Your Turn] is mandatory and [Once Per Turn].
  // The effect must appear at OnEndTurn and NOT at wrong timings.
  it("routes [End of Your Turn] to OnEndTurn and not to other timings", () => {
    const source = makeSource();
    // Q6111: the effect fires at end of turn.
    expect(module!.effectsForTiming(EffectTiming.OnEndTurn, source).length).toBeGreaterThanOrEqual(1);
    // Sanity: no end-of-turn effect in wrong windows.
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
  });

  // Q6111: "you must choose 1 of your [Marcus Damon]s" — the TAMER named Marcus Damon
  // is the target of the "also treated as a 6000 DP Digimon, gains <Rush> and can't
  // digivolve" bundle. The IR incorrectly targets kind:["Digimon"] for the Restrict
  // action; Marcus Damon is a Tamer, not a Digimon, so it would never be matched and
  // the restriction would never be applied.
  it(
    "[End of Your Turn] applies digivolve restriction to the chosen Marcus Damon Tamer",
    async () => {
      // KB-correct: the hand-fixed IR targets [Marcus Damon] by NAME without a kind
      // restriction (documented behavior CanSelectTamer has no kind check), so the Tamer is matched.
      const recorder: Recorder = { calls: [] };
      const marcusDamonDef = fakeMarcosDamonDefinition();
      const agumonDef = fakeYellowAgumonDefinition();

      // Battle area: Marcus Damon (Tamer) + a yellow Agumon (Digimon, satisfies the gate).
      const _marcusPermanent = makePermanent("PERM#marcus", marcusDamonDef);
      const _agumonPermanent = makePermanent("PERM#agumon", agumonDef, 2000);

      const _defMap = new Map<string, CardDefinition>([
        [marcusDamonDef.cardId, marcusDamonDef],
        [agumonDef.cardId, agumonDef],
      ]);

      // Use a definition map keyed by cardId. Marcus Damon shares card id AD1-021.
      // Give him a distinct fake cardId to allow the filter to match by nameEn.
      const marcusDistinctDef: CardDefinition = {
        ...marcusDamonDef,
        cardId: "MARCUS-TAMER",
        nameEn: "Marcus Damon",
        kinds: [CardKind.Tamer],
      };
      const agumonDistinctDef: CardDefinition = {
        ...agumonDef,
        cardId: "AGUMON-YELLOW",
        nameEn: "Agumon",
        kinds: [CardKind.Digimon],
      };
      const marcusPermanent2 = makePermanent("PERM#marcus", marcusDistinctDef);
      const agumonPermanent2 = makePermanent("PERM#agumon", agumonDistinctDef, 2000);

      const defMap2 = new Map<string, CardDefinition>([
        [marcusDistinctDef.cardId, marcusDistinctDef],
        [agumonDistinctDef.cardId, agumonDistinctDef],
      ]);

      const ctx = makeContext({
        recorder,
        seat0BattleArea: [marcusPermanent2, agumonPermanent2],
        definitionMap: defMap2,
      });
      // Override permanentById to handle both ids
      (ctx.game as { permanentById: (id: string) => BattleAreaEntry | undefined }).permanentById = (id) =>
        [marcusPermanent2, agumonPermanent2].find((p) => p.permanentId === id);

      const endTurnEffects = module!.effectsForTiming(EffectTiming.OnEndTurn, makeSource());
      expect(endTurnEffects.length).toBeGreaterThanOrEqual(1);
      await endTurnEffects[0]!.resolve(ctx);

      // The IR should call restrict("PERM#marcus", "digivolve", ...) for the Tamer.
      const restrictCalls = recorder.calls.filter((c) => c.verb === "restrict");
      expect(restrictCalls.length).toBeGreaterThanOrEqual(1);
      expect(restrictCalls[0]!.args[0]).toBe("PERM#marcus");
    },
  );

  // Q6102: "it can attack like a standard Digimon, and it will gain <Rush>".
  // Q6111: "1 of your [Marcus Damon]s is also treated as a 6000 DP Digimon, gains <Rush>".
  // The Rush keyword must be granted to the SAME Marcus Damon permanent that received
  // the "also treated as Digimon" treatment — NOT to a yellow Agumon/Greymon Digimon.
  // The IR GainKeyword action incorrectly targets yellow Digimon with Agumon/Greymon
  // in their name instead of the chosen Marcus Damon.
  it(
    "[End of Your Turn] grants Rush to the chosen Marcus Damon, not to a yellow Agumon/Greymon",
    async () => {
      // KB-correct: the hand-fixed IR's GainKeyword targets the name-matched
      // [Marcus Damon]; the yellow Agumon/Greymon is only the youHave gate.
      const recorder: Recorder = { calls: [] };
      const marcusDistinctDef: CardDefinition = {
        cardId: "MARCUS-TAMER",
        set: "AD1",
        nameEn: "Marcus Damon",
        kinds: [CardKind.Tamer],
        colors: [CardColor.Yellow],
        playCost: 3,
        dp: 0,
        evoCosts: [],
        maxCountInDeck: 4,
      };
      const agumonDistinctDef: CardDefinition = {
        cardId: "AGUMON-YELLOW",
        set: "BT1",
        nameEn: "Agumon",
        kinds: [CardKind.Digimon],
        colors: [CardColor.Yellow],
        playCost: 3,
        dp: 2000,
        evoCosts: [],
        maxCountInDeck: 4,
      };

      const marcusPermanent = makePermanent("PERM#marcus", marcusDistinctDef);
      const agumonPermanent = makePermanent("PERM#agumon", agumonDistinctDef, 2000);

      const defMap = new Map<string, CardDefinition>([
        [marcusDistinctDef.cardId, marcusDistinctDef],
        [agumonDistinctDef.cardId, agumonDistinctDef],
      ]);

      const ctx = makeContext({
        recorder,
        seat0BattleArea: [marcusPermanent, agumonPermanent],
        definitionMap: defMap,
      });
      (ctx.game as { permanentById: (id: string) => BattleAreaEntry | undefined }).permanentById = (id) =>
        [marcusPermanent, agumonPermanent].find((p) => p.permanentId === id);

      const endTurnEffects = module!.effectsForTiming(EffectTiming.OnEndTurn, makeSource());
      await endTurnEffects[0]!.resolve(ctx);

      // Rush must be granted to the Marcus Damon Tamer permanent, not the Agumon.
      const rushCalls = recorder.calls.filter(
        (c) => c.verb === "grantKeyword" && (c.args[1] as string) === "Rush",
      );
      expect(rushCalls.length).toBeGreaterThanOrEqual(1);
      // KB-correct: Rush goes to PERM#marcus (the chosen Marcus Damon).
      expect(rushCalls[0]!.args[0]).toBe("PERM#marcus");
    },
  );

  // The IR incorrectly emits TWO Attack actions in the EndOfYourTurn effect.
  // Q6110 confirms: two copies trigger simultaneously, but EACH has only one attack
  // declaration, confirming the effect itself has a single Attack action per copy.
  it(
    "[End of Your Turn] resolves exactly one Attack action (not two)",
    async () => {
      // KB-correct (Q6110): the EndOfYourTurn effect carries exactly ONE optional
      // Attack action.
      const recorder: Recorder = { calls: [] };
      const agumonDef: CardDefinition = {
        cardId: "AGUMON-YELLOW",
        set: "BT1",
        nameEn: "Agumon",
        kinds: [CardKind.Digimon],
        colors: [CardColor.Yellow],
        playCost: 3,
        dp: 2000,
        evoCosts: [],
        maxCountInDeck: 4,
      };
      const marcusDef: CardDefinition = {
        cardId: "MARCUS-TAMER",
        set: "AD1",
        nameEn: "Marcus Damon",
        kinds: [CardKind.Tamer],
        colors: [CardColor.Yellow],
        playCost: 3,
        dp: 0,
        evoCosts: [],
        maxCountInDeck: 4,
      };
      const agumonPermanent = makePermanent("PERM#agumon", agumonDef, 2000);
      const marcusPermanent = makePermanent("PERM#marcus", marcusDef);
      const defMap = new Map<string, CardDefinition>([
        [agumonDef.cardId, agumonDef],
        [marcusDef.cardId, marcusDef],
      ]);
      const ctx = makeContext({
        recorder,
        seat0BattleArea: [marcusPermanent, agumonPermanent],
        definitionMap: defMap,
      });
      (ctx.game as { permanentById: (id: string) => BattleAreaEntry | undefined }).permanentById = (id) =>
        [marcusPermanent, agumonPermanent].find((p) => p.permanentId === id);

      const endTurnEffects = module!.effectsForTiming(EffectTiming.OnEndTurn, makeSource());
      await endTurnEffects[0]!.resolve(ctx);

      // There should be at most 1 forceAttack call per resolution of this effect.
      // Q6110: each copy of this card can produce at most 1 attack declaration.
      const attackCalls = recorder.calls.filter((c) => c.verb === "forceAttack");
      expect(attackCalls).toHaveLength(1);
    },
  );
});
