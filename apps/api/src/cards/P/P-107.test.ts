import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./P-107.js";

// P-107 (Defense Training) — Black Option card with two [Main] clauses:
//   1. [Main] Reveal top 2; add 1 BLACK card to hand; rest to deck bottom; place this card in battle area.
//   2. [Main] <Delay> Trash self from battle area; 1 of your Digimon may digivolve into a
//      BLACK Digimon card in hand for its digivolution cost -2.
//
// KB authority (authoritative over printed text):
//   Q4192: Does not ignore digivolution requirements — only cards that meet them are legal targets.
//   Q4193: Cannot burst-digivolve or DNA-digivolve; only standard digivolve.
//   Q4194 / Q2758 / Q2767: Digivolves 1 Digimon only; Tamers cannot be the target.
//   Q4195: The controller may choose NOT to digivolve (optional).
//   documented behavior source: CanSelectCardCondition = cardSource.IsDigimon && cardSource.HasCardColor(Black);
//              reduceCostTuple = (reduceCost: 2, reduceCostCardCondition: null).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "P-107",
    set: "P",
    nameEn: "Defense Training",
    kinds: ["Option"] as never,
    colors: ["Black"] as never,
    playCost: 2,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

// The OnDeclaration <Delay> resolve path (interpreter.ts's `isDelay && timing ===
// EffectTiming.OnDeclaration` branch) deletes `ctx.source.permanent()` as the trash-cost
// before running the payload — so the source must resolve to a real battle-area permanent,
// as it would after the first [Main] clause's `PlaceInBattleAreaSelf` placed it there.
const SOURCE_PERMANENT_ID = "PERM#P104";

function makeSource(): CardSource {
  return {
    instanceId: "INST#P104",
    cardId: "P-107",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () =>
      ({
        permanentId: SOURCE_PERMANENT_ID,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "INST#P104", cardId: "P-107", ownerSeat: 0 as Seat },
        stack: [],
        linked: [],
        baseDP: 0,
        currentDP: 0,
        isSuspended: false,
        inBreeding: false,
        enterFieldTurnCount: 0,
      }) as unknown as Permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (c) => c === "Black",
  };
}

function makePlayers(
  handCards: { instanceId: string; cardId: string; ownerSeat: Seat }[] = [],
  battleArea: Permanent[] = [],
) {
  return [
    { seat: 0 as Seat, battleArea, security: [], hand: handCards, deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
}

function makeContext(opts: {
  recorder: Recorder;
  hand?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  battleArea?: Permanent[];
  definitionOverrides?: Record<string, Partial<CardDefinition>>;
  ask?: Partial<DecisionApi>;
}): EffectContext {
  const handCards = opts.hand ?? [];
  const players = makePlayers(handCards, opts.battleArea ?? []);
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: (card) => {
      const over = opts.definitionOverrides?.[card.cardId] ?? {};
      return fakeDefinition({ cardId: card.cardId, ...over });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return undefined as never;
    };

  const fx: Partial<Primitives> = {
    reveal: async (_seat, _n) => {
      opts.recorder.calls.push({ verb: "reveal", args: [_seat, _n] });
      return [];
    },
    returnToHand: record("returnToHand"),
    returnToDeck: record("returnToDeck"),
    playFromHand: async (...args) => {
      opts.recorder.calls.push({ verb: "playFromHand", args });
      return [];
    },
    playFromSecurity: async (...args) => {
      opts.recorder.calls.push({ verb: "playFromSecurity", args });
      return undefined;
    },
    playInstances: async (...args) => {
      opts.recorder.calls.push({ verb: "playInstances", args });
      return [];
    },
    digivolveFromInstance: async (...args) => {
      opts.recorder.calls.push({ verb: "digivolveFromInstance", args });
      return undefined;
    },
    deletePermanent: async (...args) => {
      opts.recorder.calls.push({ verb: "deletePermanent", args });
      return (args[0] as string[]).length;
    },
    trash: record("trash"),
    grantKeyword: record("grantKeyword"),
    grantPierce: record("grantPierce"),
    placeOptionAsPermanent: async (...args) => {
      opts.recorder.calls.push({ verb: "placeOptionAsPermanent", args });
      return undefined;
    },
    subscribeReplacement: (...args) => opts.recorder.calls.push({ verb: "subscribeReplacement", args }),
  };

  const defaultAsk: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(),
    trigger: {},
    game,
    fx: fx as Primitives,
    ask: { ...defaultAsk, ...(opts.ask ?? {}) },
  };
}

describe("P-107 (Defense Training)", () => {
  const module = getEffectModule("P-107");

  it("is registered", () => {
    expect(module, "P-107 must self-register on import").toBeDefined();
  });

  it("exposes at least one effect at OnUseOption (the [Main] body fires when played)", () => {
    // documented behavior: EffectTiming.OptionSkill => the reveal-top-2 main body.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThanOrEqual(1);
  });

  it("exposes at least one effect at SecuritySkill", () => {
    // documented behavior: EffectTiming.SecuritySkill => PlaceSelfDelayOptionSecurityEffect.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source).length).toBeGreaterThanOrEqual(1);
  });

  it("exposes at least one effect at OnDeclaration (the <Delay> activation window)", () => {
    // documented behavior: EffectTiming.OnDeclaration => the Delay effect body.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source).length).toBeGreaterThanOrEqual(1);
  });

  it("yields no effects at wrong timings (OnPlay, OnStartTurn)", () => {
    // Sanity: the card contributes nothing at unrelated windows.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
  });

  it("OnUseOption effect calls reveal(2) for the top-2 reveal clause", async () => {
    // documented behavior OptionSkill => SimplifiedRevealDeckTopCardsAndSelect(revealCount: 2, ...).
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    await effects[0]!.resolve(ctx);
    const reveals = recorder.calls.filter((c) => c.verb === "reveal");
    expect(reveals.length).toBeGreaterThanOrEqual(1);
    expect(reveals[0]!.args[1]).toBe(2);
  });

  it(// Printed text: "...Then, place this card into your battle area." documented behavior confirms this is
  // `PlaceDelayOptionCards` — a genuine self-play onto the battle area, not a keyword grant.
  // Previously this clause emitted a self-targeted permanent Delay GainKeyword as a stand-in
  // and a spurious `Return` from trash that has no basis in the
  // printed text or the documented behavior source. Now it must call fx.placeOptionAsPermanent and nothing else.
  "OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    await effects[0]!.resolve(ctx);

    const placements = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(placements).toHaveLength(1);
    expect(placements[0]!.args[0]).toBe(source.instanceId);

    // No stand-in Delay grant and no unfounded return-from-trash.
    expect(recorder.calls.some((c) => c.verb === "grantKeyword")).toBe(false);
    expect(recorder.calls.some((c) => c.verb === "returnToHand")).toBe(false);
  });

  it(// securityEffectText: "[Security] Place this card in the battle area." — an unconditional
  // placement (documented behavior PlaceSelfDelayOptionSecurityEffect), not a for-the-turn Delay grant. The
  // card's own ＜Delay＞ ability lives on the second [Main] clause, activated later by
  // trashing the placed permanent — it is not re-granted here.
  "SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    await effects[0]!.resolve(ctx);

    const placements = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(placements).toHaveLength(1);
    expect(recorder.calls.some((c) => c.verb === "grantKeyword")).toBe(false);
  });

  it(// Card text: "Add 1 black card among them to your hand."
  // documented behavior CanSelectCardCondition: cardSource.HasCardColor(targetColor) where targetColor = Black.
  // Now PASSES: the IR override sets RevealAdd `add[0].filter` to `{ colors: ["Black"] }`,
  // so a non-black revealed card is never offered/added.
  "OnUseOption RevealAdd only adds BLACK cards to hand (card text + documented behavior HasCardColor(Black))", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const recorder: Recorder = { calls: [] };

    // A non-black (Red) card and a black card are among the "revealed" results.
    // We fake reveal() to return them so the RevealAdd logic processes both.
    const redCard = { instanceId: "INST#RED-OPT", cardId: "RED-OPTION", ownerSeat: 0 as Seat };
    const blackCard = { instanceId: "INST#BLACK-OPT", cardId: "BLACK-OPTION", ownerSeat: 0 as Seat };

    const offeredToSelect: string[] = [];

    const players = makePlayers();
    const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;
    const game: GameAccess = {
      state,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: (card) => {
        if (card.cardId === "RED-OPTION") {
          return fakeDefinition({ cardId: "RED-OPTION", colors: ["Red"] as never });
        }
        if (card.cardId === "BLACK-OPTION") {
          return fakeDefinition({ cardId: "BLACK-OPTION", colors: ["Black"] as never });
        }
        return fakeDefinition({ cardId: card.cardId });
      },
    };

    const fx: Partial<Primitives> = {
      reveal: async (_seat, _n) => {
        recorder.calls.push({ verb: "reveal", args: [_seat, _n] });
        return [redCard, blackCard] as never;
      },
      returnToHand: (...args) => {
        recorder.calls.push({ verb: "returnToHand", args });
        return undefined as never;
      },
      returnToDeck: (...args) => {
        recorder.calls.push({ verb: "returnToDeck", args });
        return undefined as never;
      },
      trash: (...args) => {
        recorder.calls.push({ verb: "trash", args });
        return undefined as never;
      },
      playFromHand: async (...args) => {
        recorder.calls.push({ verb: "playFromHand", args });
        return [];
      },
      grantKeyword: (...args) => {
        recorder.calls.push({ verb: "grantKeyword", args });
        return undefined as never;
      },
    };

    const ask: DecisionApi = {
      optional: async () => true,
      selectCards: async (_c, o) => {
        for (const id of o.candidates) offeredToSelect.push(id);
        return o.candidates.slice(0, o.max);
      },
      selectPermanents: async () => [],
      chooseTargets: async (_c, o) => {
        for (const id of o.candidates) offeredToSelect.push(id);
        return o.candidates.slice(0, o.max);
      },
      chooseOption: async () => 0,
    };

    const ctx: EffectContext = { source: makeSource(), trigger: {}, game, fx: fx as Primitives, ask };
    await effects[0]!.resolve(ctx);

    // Only the black card should be offered/added — the red one must not appear.
    // With the current empty `filter: {}`, the red card IS offered, so this assertion fails.
    const addedToHand = recorder.calls.filter((c) => c.verb === "returnToHand");
    const instancesAdded = addedToHand.flatMap((c) => c.args[0] as string[]);
    expect(instancesAdded).toContain(blackCard.instanceId);
    expect(instancesAdded).not.toContain(redCard.instanceId);
  });

  // The <Delay> clause digivolves "1 of your Digimon"; both [Main] effects map to
  // OnDeclaration, so the digivolve clause must be selected by its action shape (not
  // effects[0], which is the reveal clause), and a board Digimon must be seated so
  // runDigivolve reaches the in-hand `into` selection.
  function boardDigimon(): Permanent {
    return {
      permanentId: "OWN-DIGI",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "own-top", cardId: "OWN-BASE", ownerSeat: 0 as Seat },
      stack: [],
      linked: [],
      baseDP: 0,
      currentDP: 0,
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
  }
  function digivolveClause() {
    const effects = module!.effectsForTiming(EffectTiming.OnDeclaration, makeSource());
    const effect = effects.find((e) => e.description.includes("Digivolve"));
    expect(effect, "the <Delay> digivolve clause must be present at OnDeclaration").toBeDefined();
    return effect!;
  }

  it(// Comprehensive rules §16-17-1: activating ＜Delay＞ costs trashing THIS card (the option
  // permanent placed by the first [Main] clause) — the documented behavior source deletes
  // `card.PermanentOfThisCard()`. Previously the IR mis-encoded this as `Delete{kind:
  // ["Digimon"]}`, which would trash an arbitrary Digimon target instead of the source
  // option itself. Now the trash-cost comes from the effect's declared `keywords: [Delay]`
  // going through the interpreter's OnDeclaration Delay branch, which deletes
  // `ctx.source.permanent()` — proven here by asserting deletePermanent is called with the
  // SOURCE's own permanentId, not a selected Digimon's.
  "OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)", async () => {
    const recorder: Recorder = { calls: [] };
    const blackDigimon = { instanceId: "INST#BLACK-COST", cardId: "BLACK-DIGIMON-COST", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [blackDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
        "BLACK-DIGIMON-COST": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const deletes = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.args[0]).toEqual([SOURCE_PERMANENT_ID]);
    // The board Digimon that digivolves must NOT be the one trashed as the Delay cost.
    expect(deletes[0]!.args[0]).not.toEqual(["OWN-DIGI"]);
  });

  it(// Q4192 / documented behavior CanSelectCardCondition: IsDigimon && HasCardColor(Black).
  // Now PASSES: the IR override sets the Digivolve `into` filter to
  // `{ kind: ["Digimon"], colors: ["Black"] }`, so only the black Digimon in hand is a
  // legal target — digivolveFromInstance is invoked with the black instance, never red.
  "OnDeclaration <Delay> only digivolves into a BLACK Digimon in hand (Q4192 / documented behavior HasCardColor(Black))", async () => {
    const recorder: Recorder = { calls: [] };
    const blackDigimon = { instanceId: "INST#BLACK-D", cardId: "BLACK-DIGIMON", ownerSeat: 0 as Seat };
    const redDigimon = { instanceId: "INST#RED-D", cardId: "RED-DIGIMON", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [blackDigimon, redDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
        "BLACK-DIGIMON": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
        "RED-DIGIMON": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const digivolves = recorder.calls.filter((c) => c.verb === "digivolveFromInstance");
    expect(digivolves).toHaveLength(1);
    // args: (targetPermanentId, sourceInstanceId, opts). The chosen source must be black.
    expect(digivolves[0]!.args[1]).toBe(blackDigimon.instanceId);
    expect(digivolves[0]!.args[1]).not.toBe(redDigimon.instanceId);
  });

  it(// documented behavior DigivolveIntoHandOrTrashCard: reduceCostTuple = (reduceCost: 2, reduceCostCardCondition: null).
  // Now PASSES: runDigivolve forwards the IR's costDelta:-2 to digivolveFromInstance, which
  // applies it to the paid digivolution cost (floored at 0).
  "OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)", async () => {
    const recorder: Recorder = { calls: [] };
    const blackDigimon = { instanceId: "INST#BLACK-D2", cardId: "BLACK-DIGIMON-2", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [blackDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
        "BLACK-DIGIMON-2": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const reductions = recorder.calls.filter((c) => c.verb === "subscribeReplacement");
    expect(reductions.length).toBeGreaterThanOrEqual(1);
    expect((reductions[0]!.args[0] as Record<string, unknown>).amount).toBe(2);
  });

  it("OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)", async () => {
    // Q4195: "Can I activate this card's <Delay> effect but choose to not digivolve? Yes, you can."
    // The Digivolve action is optional; declining the prompt must skip digivolveFromInstance
    // even though a legal black target is available.
    const recorder: Recorder = { calls: [] };
    const blackDigimon = { instanceId: "INST#BLACK-D3", cardId: "BLACK-DIGIMON-3", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [blackDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
        "BLACK-DIGIMON-3": { kinds: ["Digimon"] as never, colors: ["Black"] as never },
      },
      ask: {
        // Player declines every optional prompt.
        optional: async () => false,
        selectCards: async (_c, o) => o.candidates.slice(0, 1),
        chooseTargets: async (_c, o) => o.candidates.slice(0, 1),
      },
    });

    await digivolveClause().resolve(ctx);

    // When the player declines the optional digivolve, digivolveFromInstance must not fire.
    const digivolves = recorder.calls.filter((c) => c.verb === "digivolveFromInstance");
    expect(digivolves).toHaveLength(0);
  });
});
