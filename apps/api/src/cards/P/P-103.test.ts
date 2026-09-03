import { describe, it, expect } from "vitest";
import { CardColor, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./P-103.js";

// P-103 (Offense Training) — Option card with two [Main] clauses:
//   1. [Main] Reveal top 2; add 1 red to hand; rest to deck bottom; place this card in battle area.
//   2. [Main] <Delay> Trash self from battle area; 1 of your Digimon may digivolve into a
//      RED Digimon card in hand for its digivolution cost -2.
//
// KB authority (authoritative over printed text):
//   Q4188: Digivolution requirements must be met; color is a requirement.
//   Q4189: Cannot burst-digivolve or DNA-digivolve.
//   Q4190 / Q2727: Digivolves 1 Digimon; Tamers are excluded.
//   Q4191: The controller may choose NOT to digivolve (optional).
//   documented behavior source: CanSelectCardCondition = cardSource.IsDigimon && cardSource.HasCardColor(Red);
//              reduceCostTuple = (reduceCost: 2, reduceCostCardCondition: null).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "P-103",
    set: "P",
    nameEn: "Offense Training",
    kinds: ["Option"] as never,
    colors: ["Red"] as never,
    level: 3,
    playCost: 3,
    dp: 0,
    evoCosts: [{ color: CardColor.Red, level: 3, memoryCost: 3 }],
    maxCountInDeck: 4,
    ...over,
  };
}

// The OnDeclaration <Delay> resolve path (interpreter.ts's `isDelay && timing ===
// EffectTiming.OnDeclaration` branch) deletes `ctx.source.permanent()` as the trash-cost
// before running the payload — so the source must resolve to a real battle-area permanent,
// as it would after the first [Main] clause's `PlaceInBattleAreaSelf` placed it there.
const SOURCE_PERMANENT_ID = "PERM#P103";

function makeSource(): CardSource {
  return {
    instanceId: "INST#P103",
    cardId: "P-103",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () =>
      ({
        permanentId: SOURCE_PERMANENT_ID,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "INST#P103", cardId: "P-103", ownerSeat: 0 as Seat },
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
    hasColor: (c) => c === "Red",
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
  deckTop?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
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
    permanentById: (id) => players.flatMap((player) => player.battleArea).find((entry) => entry.permanentId === id),
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

describe("P-103 (Offense Training)", () => {
  const module = getEffectModule("P-103");

  it("is registered", () => {
    expect(module, "P-103 must self-register on import").toBeDefined();
  });

  it("exposes at least one effect at OnUseOption (the [Main] body fires when played)", () => {
    // Options use EffectTiming.OnUseOption when played from hand.
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

  it("OnUseOption effect calls reveal(2) for the top-2 reveal clause", async () => {
    // documented behavior: OptionSkill => SimplifiedRevealDeckTopCardsAndSelect(revealCount:2, ...).
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

  // Both [Main] effects map to OnDeclaration, so the <Delay> digivolve clause must be
  // selected by its action shape (not effects[0], the reveal clause), and a board Digimon
  // must be seated so runDigivolve reaches the in-hand `into` selection.
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
    const redDigimon = { instanceId: "INST#RED-COST", cardId: "RED-DIGIMON-COST", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [redDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
        "RED-DIGIMON-COST": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const deletes = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.args[0]).toEqual([SOURCE_PERMANENT_ID]);
    // The board Digimon that digivolves must NOT be the one trashed as the Delay cost.
    expect(deletes[0]!.args[0]).not.toEqual(["OWN-DIGI"]);
  });

  it(// Q4188: digivolution into the P-103 <Delay> effect must respect digivolution
  // requirements, including card color (documented behavior CanSelectCardCondition: IsDigimon &&
  // HasCardColor(Red)). Now PASSES: the IR override sets the Digivolve `into` filter to
  // `{ kind: ["Digimon"], colors: ["Red"] }`, so digivolveFromInstance is invoked with
  // the red instance in hand, never the blue one.
  "OnDeclaration <Delay> only digivolves into a RED Digimon in hand (Q4188 / documented behavior HasCardColor(Red))", async () => {
    const recorder: Recorder = { calls: [] };
    const redDigimon = { instanceId: "INST#RED", cardId: "RED-DIGIMON", ownerSeat: 0 as Seat };
    const blueDigimon = { instanceId: "INST#BLUE", cardId: "BLUE-DIGIMON", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [redDigimon, blueDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
        "RED-DIGIMON": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
        "BLUE-DIGIMON": { kinds: ["Digimon"] as never, colors: ["Blue"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const digivolves = recorder.calls.filter((c) => c.verb === "digivolveFromInstance");
    expect(digivolves).toHaveLength(1);
    expect(digivolves[0]!.args[1]).toBe(redDigimon.instanceId);
    expect(digivolves[0]!.args[1]).not.toBe(blueDigimon.instanceId);
  });

  it(// documented behavior DigivolveIntoHandOrTrashCard: reduceCostTuple = (reduceCost: 2, reduceCostCardCondition: null).
  // Now PASSES: runDigivolve forwards the IR's costDelta:-2 to digivolveFromInstance, which
  // applies it to the paid digivolution cost (floored at 0).
  "OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)", async () => {
    const recorder: Recorder = { calls: [] };
    const redDigimon = { instanceId: "INST#RED2", cardId: "RED-DIGIMON2", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [redDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
        "RED-DIGIMON2": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const digivolves = recorder.calls.filter((c) => c.verb === "digivolveFromInstance");
    expect(digivolves.length).toBeGreaterThanOrEqual(1);
    // The third arg is opts; opts.costDelta should carry -2 from the IR's DigivolveAction.
    const opts = digivolves[0]!.args[2] as Record<string, unknown> | undefined;
    expect(opts?.costDelta).toBe(-2);
  });

  it("OnDeclaration <Delay> does NOT digivolve when the player declines (Q4191: choosing not to is allowed)", async () => {
    // Q4191: "Can I activate this card's <Delay> effect but choose to not digivolve? Yes, you can."
    // The Digivolve action is optional; declining the prompt must skip digivolveFromInstance
    // even though a legal red target is available.
    const recorder: Recorder = { calls: [] };
    const redDigimon = { instanceId: "INST#RED3", cardId: "RED-DIGIMON3", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [redDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
        "RED-DIGIMON3": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
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

  it("places itself in the battle area when revealed as Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-103", as: "training" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("training"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("training").instanceId)).toBe(
      true,
    );
  });
  it("reveals and adds its color card before placing itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-103", as: "source" }],
          battleArea: [{ card: "BT1-009", as: "color" }],
          deck: [{ card: "BT1-009", as: "match" }, "BT1-037"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    ).toBe(true);
  });

  it("uses Delay to digivolve a Digimon into a red card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-103", as: "delay" },
            { card: "BT1-009", as: "host" },
          ],
          hand: [{ card: "BT1-016", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnCount = 1;
    await s.ready();
    const delayAbility = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(delayAbility).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("delay").instanceId,
        effectKey: delayAbility[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("delay").instanceId)).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT1-016");
    expect(s.state.memory).toBe(10);
  });
});
