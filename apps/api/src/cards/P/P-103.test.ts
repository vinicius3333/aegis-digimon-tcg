import { describe, it, expect } from "vitest";
import { CardColor, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./P-103.js";

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
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThanOrEqual(1);
  });

  it("exposes at least one effect at SecuritySkill", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source).length).toBeGreaterThanOrEqual(1);
  });

  it("exposes at least one effect at OnDeclaration (the <Delay> activation window)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source).length).toBeGreaterThanOrEqual(1);
  });

  it("OnUseOption effect calls reveal(2) for the top-2 reveal clause", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    await effects[0]!.resolve(ctx);
    const reveals = recorder.calls.filter((c) => c.verb === "reveal");
    expect(reveals.length).toBeGreaterThanOrEqual(1);
    expect(reveals[0]!.args[1]).toBe(2);
  });

  it("OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    await effects[0]!.resolve(ctx);

    const placements = recorder.calls.filter((c) => c.verb === "placeOptionAsPermanent");
    expect(placements).toHaveLength(1);
    expect(placements[0]!.args[0]).toBe(source.instanceId);

    expect(recorder.calls.some((c) => c.verb === "grantKeyword")).toBe(false);
    expect(recorder.calls.some((c) => c.verb === "returnToHand")).toBe(false);
  });

  it("SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword", async () => {
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
    const effect = effects.find((e) => /digivolve/i.test(e.description));
    expect(effect, "the <Delay> digivolve clause must be present at OnDeclaration").toBeDefined();
    return effect!;
  }

  it("OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)", async () => {
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
    expect(deletes[0]!.args[0]).not.toEqual(["OWN-DIGI"]);
  });

  it("OnDeclaration <Delay> only digivolves into a RED Digimon in hand (Q4188 / documented behavior HasCardColor(Red))", async () => {
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

  it("OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)", async () => {
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
    const opts = digivolves[0]!.args[2] as Record<string, unknown> | undefined;
    expect(opts?.costDelta).toBe(-2);
  });

  it("OnDeclaration <Delay> does NOT digivolve when the player declines (Q4191: choosing not to is allowed)", async () => {
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
        optional: async () => false,
        selectCards: async (_c, o) => o.candidates.slice(0, 1),
        chooseTargets: async (_c, o) => o.candidates.slice(0, 1),
      },
    });

    await digivolveClause().resolve(ctx);

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
