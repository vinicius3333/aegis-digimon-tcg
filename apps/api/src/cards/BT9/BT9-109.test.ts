import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { getCardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { permanentMatchesFilter } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT9-109.js";
import "./BT9-109.js";
import {
  setupEngine,
  settle as harnessSettle,
  assertNoLoudGap,
  drainMicrotasks,
  type CardSpec,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-105.js";
import "../BT4/BT4-072.js";
import "../BT7/BT7-058.js";
import "../BT7/BT7-059.js";
import "../BT7/BT7-063.js";
import "../BT11/BT11-058.js";
import "../BT13/BT13-010.js";
import "../BT11/BT11-112.js";
import "../BT12/BT12-027.js";
import "../BT12/BT12-102.js";
import "../BT12/BT12-112.js";
import "../EX2/EX2-007.js";
import "../EX2/EX2-055.js";
import "./BT9-012.js";
import "./BT9-028.js";
import "./BT9-052.js";
import "./BT9-111.js";
import { advance } from "../../engine/testkit/advance.js";
import type { PlayerState } from "@aegis/shared";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat, faceUp: true } as never;
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X",
    set: "BT9",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: ["White"] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakePermanent(over: Partial<Permanent>): Permanent {
  return {
    permanentId: "p?",
    controllerSeat: 0 as Seat,
    topCard: undefined,
    stack: [] as never,
    linked: [] as never,
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as Permanent;
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#XA",
    cardId: "BT9-109",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition({ cardId: "BT9-109", nameEn: "X Antibody", kinds: ["Option"] as never }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

const DEFINITIONS: Record<string, Partial<CardDefinition>> = {
  "HOST-D": { nameEn: "Greymon", kinds: ["Digimon"] as never },
  XA: { nameEn: "X Antibody", kinds: ["Option"] as never },
  PROTO: {
    nameEn: "X Antibody Proto Form",
    kinds: ["Option"] as never,
    effectText: getCardDefinition("EX5-070")!.effectText,
  },
  "BT9-014": getCardDefinition("BT9-014")!,
};

function makeContext(opts: { recorder: Recorder; ownBattleArea?: Permanent[] }): EffectContext {
  const rec = opts.recorder;
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      rec.calls.push({ verb, args });
      return undefined as never;
    };

  const own = opts.ownBattleArea ?? [];
  const players = [
    { seat: 0, battleArea: own, security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => own.find((p) => p.permanentId === id),
    definitionOf: (card) => fakeDefinition({ cardId: card.cardId, ...(DEFINITIONS[card.cardId] ?? {}) }),
  };

  const fx = {
    gainMemory: record("gainMemory"),
    gainMemoryForSeat: record("gainMemoryForSeat"),
    returnToHand: record("returnToHand"),
    placeUnder: record("placeUnder"),
    waiveColorRequirement: record("waiveColorRequirement"),
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

function digimonHost(permanentId: string, opts: { withXAntibody?: boolean } = {}): Permanent {
  return fakePermanent({
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance("HOST-D", permanentId + "-top"),
    stack: (opts.withXAntibody ? [fakeCardInstance("XA", permanentId + "-xa")] : []) as never,
  });
}

function digimonHostWithStack(permanentId: string, stackCardIds: string[]): Permanent {
  return fakePermanent({
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance("HOST-D", permanentId + "-top"),
    stack: stackCardIds.map((cardId, index) => fakeCardInstance(cardId, `${permanentId}-stack-${index}`)) as never,
  });
}

describe("BT9-109 X Antibody (override)", () => {
  const module = getEffectModule("BT9-109");

  it("matches catalog values and waiver, security, placement, and inherited IR", () => {
    expect(getCardDefinition("BT9-109")).toMatchObject({
      colors: ["White"],
      kinds: ["Option"],
      playCost: 0,
      types: ["X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [{ kind: "GainMemory", amount: 1 }, { kind: "AddToHandSelf" }],
        },
        {
          trigger: "Main",
          actions: [
            {
              kind: "PlaceUnder",
              position: "bottom",
              underFilter: {
                digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact", negate: true }],
              },
            },
          ],
        },
        { trigger: "AllTurns", isInherited: true, actions: [{ kind: "Restrict", restriction: "beTrashed" }] },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            { kind: "Digivolve", from: ["hand"], payCost: true, optional: true, into: { traits: ["X Antibody"] } },
          ],
        },
      ],
    });
  });

  it("registers on import", () => {
    expect(module, "BT9-109 must self-register on import").toBeDefined();
  });

  it("uses the normal printed digivolution cost for its inherited effect", () => {
    const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    const action = inherited.actions[0]!;
    expect(action).toMatchObject({ kind: "Digivolve", payCost: true, optional: true });
    expect(action).not.toHaveProperty("useAlternateCost");
  });

  it("routes its clauses to the expected timings", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThanOrEqual(1);
  });

  it("[Security] gains 1 memory, credited to its OWNER seat (not turnSeat)", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    const effect = module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource())[0]!;
    expect(effect.isSecurity).toBe(true);
    await effect.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "gainMemory")).toHaveLength(0);
    const mem = recorder.calls.filter((c) => c.verb === "gainMemoryForSeat");
    expect(mem).toHaveLength(1);
    expect(mem[0]!.args[0]).toBe(0);
    expect(mem[0]!.args[1]).toBe(1);
  });

  it("[Security] adds this card to its owner's hand", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder });
    const effect = module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource())[0]!;
    await effect.resolve(ctx);
    const toHand = recorder.calls.filter((c) => c.verb === "returnToHand");
    expect(toHand).toHaveLength(1);
    expect(toHand[0]!.args[0]).toEqual(["INST#XA"]);
  });

  it("[Main] places this card under an eligible Digimon (no [X Antibody] in its stack)", async () => {
    const recorder: Recorder = { calls: [] };
    const host = digimonHost("HOST-1");
    const ctx = makeContext({ recorder, ownBattleArea: [host] });
    const effect = module!.effectsForTiming(EffectTiming.OnUseOption, makeSource())[0]!;
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);
    const placed = recorder.calls.filter((c) => c.verb === "placeUnder");
    expect(placed).toHaveLength(1);
    expect(placed[0]!.args[0]).toBe("HOST-1");
    expect(placed[0]!.args[1]).toEqual(["INST#XA"]);
  });

  it("[Main] excludes Digimon that already have [X Antibody] in their digivolution cards (Q1922)", () => {
    const recorder: Recorder = { calls: [] };
    const host = digimonHost("HOST-1", { withXAntibody: true });
    const ctx = makeContext({ recorder, ownBattleArea: [host] });
    const effect = module!.effectsForTiming(EffectTiming.OnUseOption, makeSource())[0]!;
    expect(effect.canActivate(ctx)).toBe(false);
  });

  it("uses exact stack-card names with Rule aliases: X Antibody and Proto Form exclude, X Antibody traits do not (Q3679)", () => {
    const recorder: Recorder = { calls: [] };
    const exact = digimonHostWithStack("HOST-XA", ["XA"]);
    const proto = digimonHostWithStack("HOST-PROTO", ["PROTO"]);
    const traitOnly = digimonHostWithStack("HOST-TRAIT", ["BT9-014"]);
    const ctx = makeContext({ recorder, ownBattleArea: [exact, proto, traitOnly] });
    const place = compiled.effects
      .find((effect) => effect.trigger === "Main")
      ?.actions.find((action) => action.kind === "PlaceUnder");

    if (place?.kind !== "PlaceUnder" || place.underFilter === undefined) {
      throw new Error("BT9-109 Main PlaceUnder filter missing");
    }
    expect(permanentMatchesFilter(ctx, exact, place.underFilter, ctx.source)).toBe(false);
    expect(permanentMatchesFilter(ctx, proto, place.underFilter, ctx.source)).toBe(false);
    expect(permanentMatchesFilter(ctx, traitOnly, place.underFilter, ctx.source)).toBe(true);
  });
});

describe("BT9-109 [Security] — real engine: credits its OWNER, not the attacking turn player", () => {
  it("attacker (seat 1) checks defender's (seat 0) security; the memory goes to seat 0", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT9-109", as: "secCard" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
    });
    const p0 = s.state.players[0] as PlayerState;

    s.state.turnSeat = 1;
    const attacker = s.perm("attacker");
    const secCard = s.inst("secCard");

    const memoryFor = (seat: 0 | 1): number => (seat === s.state.turnSeat ? s.state.memory : -s.state.memory) || 0;
    expect(memoryFor(0)).toBe(0);
    expect(memoryFor(1)).toBe(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await harnessSettle(() => s.events.some((e) => e.kind === "securityChecked"));

    expect(p0.hand.some((c) => c.instanceId === secCard.instanceId)).toBe(true);

    expect(memoryFor(0)).toBe(1);
    expect(memoryFor(1)).toBe(-1);
    assertNoLoudGap(s);
  });
});

describe("BT9-109 inherited effects — real engine", () => {
  it("protects only X Antibody from an effect that trashes multiple digivolution cards (Q1922)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-019",
            as: "host",
            under: [
              { card: "BT1-009", as: "otherSource" },
              { card: "BT9-109", as: "xAntibody" },
            ],
          },
        ],
      },
    });
    const otherSourceId = s.inst("otherSource").instanceId;
    const xAntibodyId = s.inst("xAntibody").instanceId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [otherSourceId, xAntibodyId], 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === otherSourceId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === xAntibodyId)).toBe(true);
  });

  it("digivolves the attacking host into a legal X Antibody-trait Digimon for its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT9-109"] }],
          hand: [{ card: "BT9-012", as: "evolving" }],
          deck: ["BT1-013"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await harnessSettle(() => s.perm("host").topCard?.cardId === "BT9-012");

    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(2);
  });
});

describe("BT9-109 [Main] — permanent decision contract", () => {
  it("offers duplicate Digimon by permanent ID and places X Antibody under only the chosen stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "emptyHost" },
          { card: "BT1-010", as: "stackedHost", under: ["BT1-001"] },
        ],
        hand: [{ card: "BT9-109", as: "xAntibody" }],
      },
    });
    const xAntibodyInstanceId = s.inst("xAntibody").instanceId;
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: xAntibodyInstanceId,
      }),
    ).toEqual({ ok: true });
    await harnessSettle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT9-109");
    expect(new Set(decision.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("emptyHost").permanentId, s.perm("stackedHost").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("stackedHost").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await harnessSettle(() => s.perm("stackedHost").stack.some(({ instanceId }) => instanceId === xAntibodyInstanceId));

    expect(s.perm("emptyHost").stack).toHaveLength(0);
    expect(s.perm("stackedHost").stack[0]?.instanceId).toBe(xAntibodyInstanceId);
    assertNoLoudGap(s);
  });
});

describe("BT9-109 X Antibody — KB Q&A rulings", () => {
  const trashIds = (s: EngineSetup, seat: Seat): string[] =>
    s.state.players[seat]!.trash.map(({ instanceId }) => instanceId);
  const handIds = (s: EngineSetup, seat: Seat): string[] =>
    s.state.players[seat]!.hand.map(({ instanceId }) => instanceId);

  function attack(s: EngineSetup, alias: string): void {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  }

  it("lets SkullKnightmon place a DeadlyAxemon holding X Antibody under itself, and the rules trash X Antibody (Q1606)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-058", as: "skull" },
            {
              card: "BT7-059",
              as: "deadly",
              under: [
                { card: "BT1-010", as: "ordinarySource" },
                { card: "BT9-109", as: "antibody" },
              ],
            },
          ],
          hand: [{ card: "BT7-063", as: "darkKnight" }],
          deck: ["BT1-011"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deadlyTopId = s.perm("deadly").topCard!.instanceId;
    s.state.memory = 0;
    await s.ready();

    attack(s, "skull");
    await harnessSettle(() => s.perm("skull").topCard?.instanceId === s.inst("darkKnight").instanceId);

    expect(s.perm("skull").stack[0]?.instanceId).toBe(deadlyTopId);
    expect(s.perm("skull").stack.some(({ instanceId }) => instanceId === s.inst("antibody").instanceId)).toBe(false);
    expect(trashIds(s, 0)).toEqual(
      expect.arrayContaining([s.inst("antibody").instanceId, s.inst("ordinarySource").instanceId]),
    );
  });

  it("activates its inherited [When Attacking] while it sits in a Digimon's digivolution cards (Q1917)", async () => {
    async function attackWithMonodramon(under: string[]): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "host", dp: 9000, under }],
            hand: [{ card: "BT9-012", as: "evolving" }],
            deck: ["BT1-013"],
          },
          1: { security: ["BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 4;
      await s.ready();
      attack(s, "host");
      await harnessSettle(() => s.events.some(({ kind }) => kind === "securityChecked"));
      return s;
    }

    expect(getCardDefinition("BT9-109")?.kinds).toEqual(["Option"]);

    const withAntibody = await attackWithMonodramon(["BT9-109"]);
    expect(withAntibody.perm("host").topCard?.instanceId).toBe(withAntibody.inst("evolving").instanceId);
    expect(withAntibody.state.memory).toBe(2);

    const withoutAntibody = await attackWithMonodramon([]);
    expect(withoutAntibody.events.some(({ kind }) => kind === "digivolved")).toBe(false);
    expect(handIds(withoutAntibody, 0)).toContain(withoutAntibody.inst("evolving").instanceId);
    expect(withoutAntibody.state.memory).toBe(4);
  });

  it("cannot digivolve into an [X Antibody] Digimon whose digivolution requirements the attacker does not meet (Q1918)", async () => {
    async function attackWithHand(hand: CardSpec[]): Promise<EngineSetup> {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "host", dp: 9000, under: ["BT9-109"] }],
            hand,
            deck: ["BT1-013"],
          },
          1: { security: ["BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      preferInstanceIds.push(s.inst("illegal").instanceId);
      s.state.memory = 8;
      await s.ready();
      attack(s, "host");
      await harnessSettle(() => s.events.some(({ kind }) => kind === "securityChecked"));
      return s;
    }

    const onlyIllegal = await attackWithHand([{ card: "BT11-058", as: "illegal" }]);
    expect(onlyIllegal.events.some(({ kind }) => kind === "digivolved")).toBe(false);
    expect(handIds(onlyIllegal, 0)).toContain(onlyIllegal.inst("illegal").instanceId);
    expect(onlyIllegal.state.memory).toBe(8);

    const withLegal = await attackWithHand([
      { card: "BT11-058", as: "illegal" },
      { card: "BT9-012", as: "legal" },
    ]);
    expect(withLegal.perm("host").topCard?.instanceId).toBe(withLegal.inst("legal").instanceId);
    expect(handIds(withLegal, 0)).toContain(withLegal.inst("illegal").instanceId);
  });

  it("applies a digivolution cost reduction to the digivolve from its inherited effect (Q1919)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-052", as: "host", under: ["BT9-109"] }],
          hand: [{ card: "BT11-058", as: "evolving" }],
          deck: ["BT1-013"],
        },
        1: { security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    attack(s, "host");
    await harnessSettle(() => s.perm("host").topCard?.instanceId === s.inst("evolving").instanceId);

    const printedCost = getCardDefinition("BT11-058")!.evoCosts[0]!.memoryCost;
    expect(printedCost).toBe(4);
    expect(s.state.memory).toBe(5 - (printedCost - 1));
  });

  it("cannot be trashed as a <Digi-Burst> cost from its host's digivolution cards (Q1920)", async () => {
    async function gogmamonOver(under: CardSpec[]): Promise<EngineSetup> {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT4-072", as: "gog", under }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      return s;
    }
    const digiBurstOf = (s: EngineSetup) =>
      observe(s.engine)
        .activatableEffects(s.perm("gog"))
        .find(({ effectKey }) => effectKey.startsWith("BT4-072/"));

    const control = await gogmamonOver([
      { card: "BT1-009", as: "burstable" },
      { card: "BT9-109", as: "antibody" },
    ]);
    const controlBurst = digiBurstOf(control);
    expect(controlBurst).toBeDefined();
    const dpBefore = control.perm("gog").currentDP;
    expect(
      control.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: control.perm("gog").topCard!.instanceId,
        effectKey: controlBurst!.effectKey,
      }),
    ).toEqual({ ok: true });
    await harnessSettle(() => control.perm("gog").currentDP === dpBefore + 2000);
    expect(trashIds(control, 0)).toContain(control.inst("burstable").instanceId);
    expect(control.perm("gog").stack.map(({ instanceId }) => instanceId)).toEqual([
      control.inst("antibody").instanceId,
    ]);

    const onlyAntibody = await gogmamonOver([{ card: "BT9-109", as: "antibody" }]);
    expect(digiBurstOf(onlyAntibody)).toBeUndefined();
    const onlyDpBefore = onlyAntibody.perm("gog").currentDP;
    expect(
      onlyAntibody.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: onlyAntibody.perm("gog").topCard!.instanceId,
        effectKey: controlBurst!.effectKey,
      }),
    ).not.toEqual({ ok: true });
    await drainMicrotasks();
    expect(onlyAntibody.perm("gog").stack.map(({ instanceId }) => instanceId)).toEqual([
      onlyAntibody.inst("antibody").instanceId,
    ]);
    expect(onlyAntibody.perm("gog").currentDP).toBe(onlyDpBefore);
  });

  it.fails("is rule-trashed with the cards under it, not deleted, when <De-Digivolve> leaves it on top (Q1921)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT7-059"],
          hand: [{ card: "BT2-105", as: "spiderShooter" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-019",
              as: "host",
              under: [
                { card: "BT13-010", as: "bottom" },
                { card: "BT9-109", as: "antibody" },
              ],
            },
          ],
          deck: [{ card: "BT1-010", as: "onDeletionDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const hostCardIds = [
      s.perm("host").topCard!.instanceId,
      s.inst("antibody").instanceId,
      s.inst("bottom").instanceId,
    ];
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spiderShooter").instanceId })).toEqual({
      ok: true,
    });
    await harnessSettle(
      () => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === hostPermanentId),
    );

    expect(trashIds(s, 1)).toEqual(expect.arrayContaining(hostCardIds));
    expect(handIds(s, 1)).not.toContain(s.inst("onDeletionDraw").instanceId);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT13-010")).toBe(false);
  });

  it("lets Reaper trash the 7 sources above a bottom X Antibody under an 8-source Mother D-Reaper for a 0 play cost (Q1923)", async () => {
    async function playReaperOver(otherSourceCount: number): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX2-007",
                as: "mother",
                under: [
                  { card: "BT9-109", as: "antibody" },
                  ...Array.from({ length: otherSourceCount }, () => "BT1-009"),
                ],
              },
            ],
            hand: [{ card: "EX2-055", as: "reaper" }],
            deck: ["BT1-009", "BT1-013"],
            security: ["BT1-009"],
          },
          1: { deck: ["BT1-009", "BT1-013"], security: ["BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 10;
      await s.ready();
      const reaperId = s.inst("reaper").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({ ok: true });
      await harnessSettle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === reaperId));
      return s;
    }

    const eightSources = await playReaperOver(7);
    expect(eightSources.perm("mother").stack.map(({ instanceId }) => instanceId)).toEqual([
      eightSources.inst("antibody").instanceId,
    ]);
    expect(eightSources.state.players[0]!.trash).toHaveLength(7);
    expect(eightSources.state.memory).toBe(10);

    const sevenSources = await playReaperOver(6);
    expect(sevenSources.perm("mother").stack).toHaveLength(7);
    expect(sevenSources.state.players[0]!.trash).toHaveLength(0);
    expect(sevenSources.state.memory).toBeLessThan(10);
  });

  it("lets Alphamon: Ouryuken return X Antibody from its digivolution cards to the deck bottom at end of turn (Q1927)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-111",
              as: "ouryuken",
              under: [
                { card: "BT9-109", as: "antibody" },
                { card: "BT1-009", as: "noTrait" },
              ],
            },
          ],
          deck: ["BT1-013"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("ouryuken"));
    await harnessSettle(() => s.state.memory === 1);

    const deckIds = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    expect(deckIds.at(-1)).toBe(s.inst("antibody").instanceId);
    expect(trashIds(s, 0)).not.toContain(s.inst("antibody").instanceId);
    expect(s.perm("ouryuken").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("noTrait").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it.fails("lets Rina activate the [When Digivolving] of the card a suspended Veedramon digivolved into via X Antibody (Q2143)", async () => {
    async function attackWithVeedramon(withRina: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              ...(withRina ? [{ card: "BT11-112", as: "rina" }] : []),
              { card: "BT11-027", as: "veedramon", under: [{ card: "BT9-109", as: "antibody" }] },
            ],
            hand: [{ card: "BT9-028", as: "wereGarurumon" }],
            deck: ["BT1-013", "BT1-013"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "firstVictim" },
              { card: "BT1-010", as: "secondVictim" },
            ],
            security: ["BT1-013"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT9-109"] },
      );
      s.state.memory = 5;
      await s.ready();
      attack(s, "veedramon");
      await harnessSettle(() => s.events.some(({ kind }) => kind === "securityChecked"));
      return s;
    }

    const withRina = await attackWithVeedramon(true);
    expect(withRina.perm("veedramon").topCard.instanceId).toBe(withRina.inst("wereGarurumon").instanceId);
    expect(withRina.perm("rina").isSuspended).toBe(true);
    expect(withRina.state.players[1]!.battleArea).toHaveLength(0);
    expect(handIds(withRina, 1)).toEqual(
      expect.arrayContaining([withRina.inst("firstVictim").instanceId, withRina.inst("secondVictim").instanceId]),
    );

    const withoutRina = await attackWithVeedramon(false);
    expect(withoutRina.perm("veedramon").topCard.instanceId).toBe(withoutRina.inst("wereGarurumon").instanceId);
    expect(withoutRina.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("is rule-trashed when Mermaimon places its host Digimon under itself as a bottom source (Q2167)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-025",
              as: "moved",
              under: [
                { card: "BT9-109", as: "antibody" },
                { card: "BT12-019", as: "otherSource" },
              ],
            },
          ],
          hand: [{ card: "BT12-027", as: "mermaimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const movedTopId = s.perm("moved").topCard.instanceId;
    const mermaimonId = s.inst("mermaimon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: mermaimonId })).toEqual({ ok: true });
    await harnessSettle(() => s.state.players[0]!.battleArea.length === 1 && s.state.memory === 5);

    const mermaimon = s.state.players[0]!.battleArea[0]!;
    expect(mermaimon.topCard.instanceId).toBe(mermaimonId);
    expect(mermaimon.stack.map(({ instanceId }) => instanceId)).toEqual([movedTopId]);
    expect(trashIds(s, 0)).toEqual(
      expect.arrayContaining([s.inst("antibody").instanceId, s.inst("otherSource").instanceId]),
    );
  });

  it("is rule-trashed when Great Maelstrom places its host blue Digimon under another blue Digimon (Q2238)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-102", as: "maelstrom" }],
          battleArea: [
            { card: "BT1-029", as: "moved", under: [{ card: "BT9-109", as: "antibody" }] },
            { card: "BT1-029", as: "destination" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const movedPermanentId = s.perm("moved").permanentId;
    const movedTopId = s.perm("moved").topCard.instanceId;
    preferInstanceIds.push(movedPermanentId);
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maelstrom").instanceId })).toEqual({
      ok: true,
    });
    await harnessSettle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === movedPermanentId)).toBe(false);
    expect(s.perm("destination").stack.map(({ instanceId }) => instanceId)).toEqual([movedTopId]);
    expect(trashIds(s, 0)).toContain(s.inst("antibody").instanceId);
  });

  it.fails("is rule-trashed when Shoutmon X7: Superior Mode places a Shoutmon holding it as a digivolution card (Q2251)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-008", as: "shoutmon", under: [{ card: "BT9-109", as: "antibody" }] }],
          hand: [{ card: "BT12-112", as: "x7" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const shoutmonTopId = s.perm("shoutmon").topCard.instanceId;
    const x7Id = s.inst("x7").instanceId;
    s.state.memory = 14;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: x7Id })).toEqual({ ok: true });
    await harnessSettle(
      () => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === x7Id) && s.state.memory === 0,
    );

    const x7 = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === x7Id)!;
    expect(s.state.memory).toBe(0);
    expect(x7.stack.map(({ instanceId }) => instanceId)).toEqual([shoutmonTopId]);
    expect(trashIds(s, 0)).toContain(s.inst("antibody").instanceId);
  });

  async function playReaperOverMother(motherSources: CardSpec[]): Promise<EngineSetup> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: motherSources }],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: ["BT1-009", "BT1-013"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-013"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const reaperId = s.inst("reaper").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({ ok: true });
    await harnessSettle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === reaperId));
    return s;
  }

  const plainSources = (count: number): CardSpec[] => Array.from({ length: count }, () => "BT1-009");

  it("lets Reaper's play-cost effect declare all 8 sources of Mother D-Reaper and trash the 7 above a bottom X Antibody for a 0 play cost (Q3288)", async () => {
    const eightSources = await playReaperOverMother([{ card: "BT9-109", as: "antibody" }, ...plainSources(7)]);
    const antibodyId = eightSources.inst("antibody").instanceId;
    expect(eightSources.perm("mother").stack.map(({ instanceId }) => instanceId)).toEqual([antibodyId]);
    expect(trashIds(eightSources, 0)).toHaveLength(7);
    expect(trashIds(eightSources, 0)).not.toContain(antibodyId);
    expect(eightSources.state.memory).toBe(10);

    const sevenSources = await playReaperOverMother([{ card: "BT9-109", as: "antibody" }, ...plainSources(6)]);
    expect(sevenSources.perm("mother").stack).toHaveLength(7);
    expect(trashIds(sevenSources, 0)).toHaveLength(0);
    expect(sevenSources.state.memory).toBeLessThan(10);
  });

  it("sets Reaper's play cost to 0 when 7 sources other than an X Antibody among Mother D-Reaper's 8 can be trashed (Q3347)", async () => {
    const eightSources = await playReaperOverMother([
      ...plainSources(3),
      { card: "BT9-109", as: "antibody" },
      ...plainSources(4),
    ]);
    const antibodyId = eightSources.inst("antibody").instanceId;
    expect(eightSources.perm("mother").stack.map(({ instanceId }) => instanceId)).toEqual([antibodyId]);
    expect(trashIds(eightSources, 0)).toHaveLength(7);
    expect(trashIds(eightSources, 0)).not.toContain(antibodyId);
    expect(eightSources.state.memory).toBe(10);

    const sevenSources = await playReaperOverMother([
      ...plainSources(3),
      { card: "BT9-109", as: "antibody" },
      ...plainSources(3),
    ]);
    expect(sevenSources.perm("mother").stack).toHaveLength(7);
    expect(trashIds(sevenSources, 0)).toHaveLength(0);
    expect(sevenSources.state.memory).toBeLessThan(10);
  });
});
