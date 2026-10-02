import { describe, it, expect } from "vitest";
import { CardColor, EffectTiming, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-108.js";
import {
  delayDigivolvesThroughAlternateCondition,
  expectDelayCannotUseHandMainRoute,
  expectDelayDoesNotBurst,
  expectDelayIgnoresTamers,
  expectDelayKeepsRequirements,
  expectDelayMayDecline,
} from "./qaRulings2.testSupport.js";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "P-108",
    set: "P",
    nameEn: "Wisdom Training",
    kinds: ["Option"] as never,
    colors: ["Purple"] as never,
    level: 3,
    playCost: 2,
    dp: 0,
    evoCosts: [{ color: CardColor.Purple, level: 3, memoryCost: 3 }],
    maxCountInDeck: 4,
    ...over,
  };
}

const SOURCE_PERMANENT_ID = "PERM#P104";

function makeSource(): CardSource {
  return {
    instanceId: "INST#P104",
    cardId: "P-108",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () =>
      ({
        permanentId: SOURCE_PERMANENT_ID,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "INST#P104", cardId: "P-108", ownerSeat: 0 as Seat },
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
    hasColor: (c) => c === "Purple",
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
    trash: async (...args) => {
      opts.recorder.calls.push({ verb: "trash", args });
      return (args[0] as string[]).map((instanceId) => ({ instanceId, cardId: "", ownerSeat: 0 as Seat }) as never);
    },
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

describe("P-108 (Wisdom Training)", () => {
  const module = getEffectModule("P-108");

  it("is registered", () => {
    expect(module, "P-108 must self-register on import").toBeDefined();
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

  it("yields no effects at wrong timings (OnPlay, OnStartTurn)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
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

  it("OnUseOption RevealAdd only adds PURPLE cards to hand (card text + documented behavior HasCardColor(Purple))", async () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);

    const recorder: Recorder = { calls: [] };

    const redCard = { instanceId: "INST#RED-OPT", cardId: "RED-OPTION", ownerSeat: 0 as Seat };
    const purpleCard = { instanceId: "INST#PURPLE-OPT", cardId: "PURPLE-OPTION", ownerSeat: 0 as Seat };

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
        if (card.cardId === "PURPLE-OPTION") {
          return fakeDefinition({ cardId: "PURPLE-OPTION", colors: ["Purple"] as never });
        }
        return fakeDefinition({ cardId: card.cardId });
      },
    };

    const fx: Partial<Primitives> = {
      reveal: async (_seat, _n) => {
        recorder.calls.push({ verb: "reveal", args: [_seat, _n] });
        return [redCard, purpleCard] as never;
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

    const addedToHand = recorder.calls.filter((c) => c.verb === "returnToHand");
    const instancesAdded = addedToHand.flatMap((c) => c.args[0] as string[]);
    expect(instancesAdded).toContain(purpleCard.instanceId);
    expect(instancesAdded).not.toContain(redCard.instanceId);
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
    const purpleDigimon = { instanceId: "INST#PURPLE-COST", cardId: "PURPLE-DIGIMON-COST", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [purpleDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
        "PURPLE-DIGIMON-COST": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    // CR 4-16-3: trashing is not deletion, so the cost never routes through deletePermanent.
    expect(recorder.calls.some((c) => c.verb === "deletePermanent")).toBe(false);
    const trashes = recorder.calls.filter((c) => c.verb === "trash");
    expect(trashes).toHaveLength(1);
    expect(trashes[0]!.args[0]).toEqual([makeSource().instanceId]);
  });

  it("OnDeclaration <Delay> only digivolves into a PURPLE Digimon in hand (Q4192 / documented behavior HasCardColor(Purple))", async () => {
    const recorder: Recorder = { calls: [] };
    const purpleDigimon = { instanceId: "INST#PURPLE-D", cardId: "PURPLE-DIGIMON", ownerSeat: 0 as Seat };
    const redDigimon = { instanceId: "INST#RED-D", cardId: "RED-DIGIMON", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [purpleDigimon, redDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
        "PURPLE-DIGIMON": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
        "RED-DIGIMON": { kinds: ["Digimon"] as never, colors: ["Red"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const digivolves = recorder.calls.filter((c) => c.verb === "digivolveFromInstance");
    expect(digivolves).toHaveLength(1);
    expect(digivolves[0]!.args[1]).toBe(purpleDigimon.instanceId);
    expect(digivolves[0]!.args[1]).not.toBe(redDigimon.instanceId);
  });

  it("OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)", async () => {
    const recorder: Recorder = { calls: [] };
    const purpleDigimon = { instanceId: "INST#PURPLE-D2", cardId: "PURPLE-DIGIMON-2", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [purpleDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
        "PURPLE-DIGIMON-2": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
      },
    });

    await digivolveClause().resolve(ctx);

    const digivolves = recorder.calls.filter((c) => c.verb === "digivolveFromInstance");
    expect(digivolves.length).toBeGreaterThanOrEqual(1);
    const opts = digivolves[0]!.args[2] as Record<string, unknown> | undefined;
    expect(opts?.costDelta).toBe(-2);
  });

  it("OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)", async () => {
    const recorder: Recorder = { calls: [] };
    const purpleDigimon = { instanceId: "INST#PURPLE-D3", cardId: "PURPLE-DIGIMON-3", ownerSeat: 0 as Seat };

    const ctx = makeContext({
      recorder,
      hand: [purpleDigimon],
      battleArea: [boardDigimon()],
      definitionOverrides: {
        "OWN-BASE": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
        "PURPLE-DIGIMON-3": { kinds: ["Digimon"] as never, colors: ["Purple"] as never },
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

  it("places itself in the battle area from its Security effect", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-108", as: "training" }] } });
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
          hand: [{ card: "P-108", as: "source" }],
          battleArea: [{ card: "ST6-03", as: "color" }],
          deck: [{ card: "ST6-03", as: "match" }, "BT1-009"],
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
  it("uses Delay on a later turn to digivolve into the printed color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-108", as: "delay" },
            { card: "BT10-071", as: "host" },
          ],
          hand: [{ card: "BT10-074", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnCount = 1;
    await s.ready();
    const ability = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(ability).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("delay").instanceId,
        effectKey: ability[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT10-074");
  });
});

describe("P-108 Wisdom Training — KB Q&A rulings", () => {
  it("keeps the target's digivolution requirements: a level 3 cannot take a level 5 (Q4208)", async () => {
    await expectDelayKeepsRequirements("P-108", "BT2-067", "BT2-075");
  });

  it("does not burst digivolve into a card in hand (Q4209)", async () => {
    await expectDelayDoesNotBurst("P-108", { host: "BT13-089", tamer: "BT13-102", target: "BT13-092" }, 5);
  });

  it("does not digivolve a Tamer into a 'Tamer digivolves as a Digimon' card (Q4210)", async () => {
    await expectDelayIgnoresTamers("P-108", "BT2-090", "BT7-071");
  });

  it("may be activated without digivolving (Q4211)", async () => {
    await expectDelayMayDecline("P-108", "BT2-067", "BT2-071");
  });

  it("digivolves Impmon into BT2-111 Beelzemon with 10 or more cards in trash (Q4212)", async () => {
    await delayDigivolvesThroughAlternateCondition(
      "P-108",
      {
        battleArea: [{ card: "BT2-068", as: "host" }],
        hand: [{ card: "BT2-111", as: "target" }],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
      {},
      2,
      "BT2-111",
    );
  });

  it("lets ST21-10 Gabumon use its [Your Turn] MetalGarurumon route at the same time (Q5204)", async () => {
    await delayDigivolvesThroughAlternateCondition(
      "P-108",
      { battleArea: [{ card: "ST21-10", as: "host" }], hand: [{ card: "BT2-081", as: "target" }] },
      { battleArea: [{ card: "BT1-025", dp: 12000 }] },
      2,
      "BT2-081",
    );
  });

  it("cannot run BT23-065 Phantomon's {Hand} [Main] route at the same time (Q5335)", async () => {
    await expectDelayCannotUseHandMainRoute("P-108", {
      host: "BT23-061",
      tamer: "BT23-087",
      material: "BT15-073",
      target: "BT23-065",
    });
  });

  it("lets BT25-082 BlackGatomon use its Three Musketeers Tamer route at the same time (Q6392)", async () => {
    await delayDigivolvesThroughAlternateCondition(
      "P-108",
      {
        battleArea: [{ card: "BT25-082", as: "host" }, "BT24-088"],
        hand: [{ card: "BT6-112", as: "target" }],
      },
      {},
      2,
      "BT6-112",
    );
  });
});
