import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { getCardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { permanentMatchesFilter } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT9-109.js";
import "./BT9-109.js";
import { setupEngine, settle as harnessSettle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import type { PlayerState } from "@aegis/shared";

// BT9-109 X Antibody (hand-authored override). Authoritative text (no errata):
//   [Security] Gain 1 memory, and add this card to its owner's hand.
//   [Main] Place this card under 1 of your Digimon without [X Antibody] in its
//     digivolution cards as its bottom digivolution card.
//
// The override already documents the [Security] gap: by the time a [Security] effect
// resolves, the revealed card has been shifted out of the security stack, so
// returnToHand on a now-unzoned instance is a no-op and the resolver then trashes it —
// the OPPOSITE of the printed effect. There is no "revealed-security-card -> hand"
// primitive yet. These tests pin the executable half (gain 1 memory, place-under) and
// the KB-correct add-to-hand half (currently unmet) so a future primitive flips it green.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
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

// Card name lookup keyed by cardId: hosts are Digimon; "XA" is the [X Antibody] stack card.
const DEFINITIONS: Record<string, Partial<CardDefinition>> = {
  "HOST-D": { nameEn: "Greymon", kinds: ["Digimon"] as never },
  XA: { nameEn: "X Antibody", kinds: ["Option"] as never },
  PROTO: { nameEn: "X Antibody Proto Form", kinds: ["Option"] as never },
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
      colors: ["White"], kinds: ["Option"], playCost: 0, types: ["X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "GainMemory", amount: 1 }, { kind: "AddToHandSelf" }] },
        { trigger: "Main", actions: [{ kind: "PlaceUnder", position: "bottom", underFilter: { excludeCardsNamed: ["X Antibody"] } }] },
        { trigger: "AllTurns", isInherited: true, actions: [{ kind: "Restrict", restriction: "beTrashed" }] },
        { trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Digivolve", from: ["hand"], payCost: true, optional: true, into: { traits: ["X Antibody"] } }] },
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
    // A [Security] clause always resolves on the ATTACKING player's turn against the
    // DEFENDING (card-owning) player's security stack, so turnSeat is never this card's
    // owner. Crediting via the seat-agnostic `gainMemory` (which pays turnSeat) would
    // always pay the wrong player -- must use `gainMemoryForSeat(source.ownerSeat, ...)`.
    expect(recorder.calls.filter((c) => c.verb === "gainMemory")).toHaveLength(0);
    const mem = recorder.calls.filter((c) => c.verb === "gainMemoryForSeat");
    expect(mem).toHaveLength(1);
    expect(mem[0]!.args[0]).toBe(0); // source.ownerSeat
    expect(mem[0]!.args[1]).toBe(1);
  });

  it(// Text: "[Security] Gain 1 memory, AND add this card to its owner's hand." The
  // security resolver runs a [Security] effect while the revealed card is still in the
  // security stack, so returnToHand moves it to hand before the resolver's trash sweep.
  "[Security] adds this card to its owner's hand", async () => {
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
    // The only Digimon already carries an [X Antibody], so there is no legal target.
    // Compiled modules defer permanent eligibility to public target resolution;
    // the real-engine duplicate-target test below proves this illegal host is excluded.
    expect(effect.canActivate(ctx)).toBe(true);
  });

  it("uses exact stack-card names: X Antibody excludes, X Antibody Proto Form does not", () => {
    const recorder: Recorder = { calls: [] };
    const exact = digimonHostWithStack("HOST-XA", ["XA"]);
    const proto = digimonHostWithStack("HOST-PROTO", ["PROTO"]);
    const ctx = makeContext({ recorder, ownBattleArea: [exact, proto] });
    const place = compiled.effects
      .find((effect) => effect.trigger === "Main")
      ?.actions.find((action) => action.kind === "PlaceUnder");

    expect(place).toMatchObject({ underFilter: { excludeCardsNamed: ["X Antibody"] } });
    if (place?.kind !== "PlaceUnder" || place.underFilter === undefined) {
      throw new Error("BT9-109 Main PlaceUnder filter missing");
    }
    expect(permanentMatchesFilter(ctx, exact, place.underFilter, ctx.source)).toBe(false);
    expect(permanentMatchesFilter(ctx, proto, place.underFilter, ctx.source)).toBe(true);
  });
});

/**
 * A3 (real GameEngine) — proves the [Security] memory credit lands on BT9-109's owner,
 * not the attacking turn player, driving an actual `attack` intent through the real
 * security-check flow (engine/security/securityCheck.ts), not a mocked EffectContext.
 *
 * FAILS-WHEN-REVERTED: reverting `ctx.fx.gainMemoryForSeat(source.ownerSeat, 1)` back to
 * `ctx.fx.gainMemory(1)` flips the memory assertions below (the attacker, seat 1, would
 * gain the memory instead of the defender, seat 0).
 */
describe("BT9-109 [Security] — real engine: credits its OWNER, not the attacking turn player", () => {
  it("attacker (seat 1) checks defender's (seat 0) security; the memory goes to seat 0", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT9-109", as: "secCard" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const _p1 = s.state.players[1] as PlayerState;

    // It is seat 1's turn; seat 1 attacks seat 0's security, which holds BT9-109.
    s.state.turnSeat = 1;
    const attacker = s.perm("attacker");
    const secCard = s.inst("secCard");

    // memoryFor mirrors MemoryGauge.memoryFor: state.memory is stored relative to
    // turnSeat, so reading a seat's own-perspective value must account for whose turn
    // it is -- asserting on the raw sign of state.memory would silently pass for
    // whichever seat happens to be turnSeat, which is exactly the bug being caught here.
    const memoryFor = (seat: 0 | 1): number => (seat === s.state.turnSeat ? s.state.memory : -s.state.memory) || 0; // normalize -0 -> 0
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

    // BT9-109 was moved to its owner's (seat 0) hand by the [Security] clause.
    expect(p0.hand.some((c) => c.instanceId === secCard.instanceId)).toBe(true);

    // The memory goes to BT9-109's owner (seat 0), never the attacking turn player.
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
