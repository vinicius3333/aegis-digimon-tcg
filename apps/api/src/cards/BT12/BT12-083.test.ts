import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import "./BT12-083.js";
import "./BT12-038.js";
import "../BT15/BT15-047.js";
import "../BT17/BT17-087.js";

function fakeDef(cardId: string, kind: CardKind = CardKind.Digimon): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Purple"] as never,
    playCost: 5,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeStackedPerm(stackSize: number): unknown {
  const stack = Array.from({ length: stackSize }, (_, i) => ({
    cardId: `stack-${i}`,
    instanceId: `s${i}`,
    ownerSeat: 0 as Seat,
    faceUp: true,
  }));
  return {
    permanentId: "self-perm",
    controllerSeat: 0 as Seat,
    topCard: { cardId: "BT12-083", instanceId: "inst-083", ownerSeat: 0 as Seat, faceUp: true },
    stack,
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSource(perm?: unknown): CardSource {
  return {
    instanceId: "inst-083",
    cardId: "BT12-083",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT12-083"),
    permanent: () => perm as Permanent | undefined,
    isOnBattleArea: () => perm !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type ForceAttackCall = { permanentId: string; withoutSuspending?: boolean };

function makeCtx(opts: {
  forceAttackCalls: ForceAttackCall[];
  selfPerm: unknown;
  isOwnersTurn?: boolean;
}): EffectContext {
  const { forceAttackCalls, selfPerm, isOwnersTurn = true } = opts;

  const players = [
    { battleArea: [selfPerm], security: [], hand: [], deck: [], trash: [] },
    { battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  };

  const fx = {
    forceAttack: async (permanentId: string, opts?: { withoutSuspending?: boolean }) => {
      forceAttackCalls.push({ permanentId, withoutSuspending: opts?.withoutSuspending });
    },
    relocatePermanent: () => false,
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async (_ctx, _msg) => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async (_ctx, _choices) => 0,
  };

  const source = makeSource(selfPerm as Permanent);

  return {
    source: { ...source, isOwnersTurn: () => isOwnersTurn },
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as unknown as EffectContext;
}

describe("BT12-083 Arresterdramon: Superior Mode [End of Your Turn]", () => {
  it("registers the end-of-turn attack clause without a residual gap", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-083")!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(JSON.stringify(card)).not.toContain("RawUnparsed");
  });

  it("counts distinct Tamer colors for the level ceiling", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-083")!;
    const whenDigivolving = card.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      targetIsPermanent: true,
      shedOwnCards: true,
      position: "bottom",
      scaling: { per: 1, unit: "colors", levelCeilingAdd: 1 },
    });
  });

  it("raises the placed Digimon level ceiling for each distinct Tamer color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-083", as: "arrester" },
            { card: "BT12-087", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT12-087", as: "destination" },
            { card: "BT12-010", as: "target", under: ["BT12-009"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arrester"));
    expect(s.perm("destination").stack.map(({ cardId }) => cardId)).toContain("BT12-010");
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-010")).toBe(false);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT12-009");
  });

  it("limits the Save alternate evolution to red, black, or purple level 4 cards", () => {
    expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT12-011")?.cost).toBe(4);
    expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT12-037")).toBeUndefined();
  });

  it("calls forceAttack(withoutSuspending: true) when stack has 4+ digivolution cards", async () => {
    const forceAttackCalls: ForceAttackCall[] = [];
    const selfPerm = makeStackedPerm(4);

    const ctx = makeCtx({ forceAttackCalls, selfPerm });

    const mod = getEffectModule("BT12-083");
    expect(mod).toBeDefined();

    const effects = mod!.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm as Permanent));
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    expect(forceAttackCalls).toHaveLength(1);
    expect(forceAttackCalls[0]!.withoutSuspending).toBe(true);
    expect(forceAttackCalls[0]!.permanentId).toBe("self-perm");
  });

  it("does NOT call forceAttack when stack has fewer than 4 digivolution cards", async () => {
    const forceAttackCalls: ForceAttackCall[] = [];
    const selfPerm = makeStackedPerm(3);

    const ctx = makeCtx({ forceAttackCalls, selfPerm });

    const mod = getEffectModule("BT12-083");
    const effects = mod!.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm as Permanent));

    for (const eff of effects) {
      const canAct = eff.canActivate?.(ctx);
      if (canAct !== false) await eff.resolve(ctx);
    }

    expect(forceAttackCalls).toHaveLength(0);
  });

  it("[When Attacking] inherited draw effect is registered at attack timing", () => {
    const mod = getEffectModule("BT12-083");
    const effects = mod!.effectsForTiming(EffectTiming.OnUseAttack, makeSource());
    expect(effects.length).toBeGreaterThan(0);
    expect(effects[0]!.isInherited).toBe(true);
  });

  it("draws from the inherited Save attack effect only on a Save-text host", async () => {
    const save = setupEngine({
      0: { battleArea: [{ card: "BT12-077", as: "host", under: ["BT12-083"] }], deck: ["BT1-010"] },
    });
    await save.ready();
    await advance(save.engine).fire(EffectTiming.OnUseAttack, save.perm("host"));
    expect(save.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-010");

    const plain = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-083"] }], deck: ["BT1-010"] },
    });
    await plain.ready();
    await advance(plain.engine).fire(EffectTiming.OnUseAttack, plain.perm("host"));
    expect(plain.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT1-010");
  });
});

describe("BT12-083 Arresterdramon: Superior Mode — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;
  const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

  function arresterBoard(own: SeatSpec, opponent: SeatSpec, preferred: string[] = []): Setup {
    return setupEngine(
      {
        0: {
          deck: FILLER,
          security: ["BT1-009", "BT1-009"],
          ...own,
          battleArea: [{ card: "BT4-080", as: "base" }, ...(own.battleArea ?? [])],
          hand: [{ card: "BT12-083", as: "arrester" }, ...(own.hand ?? [])],
        },
        1: { deck: FILLER, security: ["BT1-009", "BT1-009"], ...opponent },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
  }

  async function digivolveIntoArrester(s: Setup): Promise<void> {
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("arrester").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-083");
    await drainMicrotasks();
  }

  const opponentBoardIds = (s: Setup): string[] => s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId);

  it("adds 1 to the max level per distinct color among your Tamers, counting a multicolor Tamer once for its new colors (Q2216)", async () => {
    const threeColors = arresterBoard(
      {
        battleArea: [
          { card: "BT1-085", as: "red" },
          { card: "BT21-085", as: "redBlue" },
          { card: "ST24-13", as: "blueYellow" },
        ],
      },
      {
        battleArea: [
          { card: "BT1-080", as: "levelSix" },
          { card: "BT1-085", as: "opponentTamer" },
        ],
      },
    );
    await digivolveIntoArrester(threeColors);
    expect(opponentBoardIds(threeColors)).toEqual(["BT1-085"]);
    expect(threeColors.perm("opponentTamer").stack.map(({ cardId }) => cardId)).toEqual(["BT1-080"]);

    const twoColorsFromThreeTamers = arresterBoard(
      {
        battleArea: [
          { card: "BT1-085", as: "red" },
          { card: "BT12-088", as: "differentRedTamer" },
          { card: "BT21-085", as: "redBlue" },
        ],
      },
      {
        battleArea: [
          { card: "BT1-080", as: "levelSix" },
          { card: "BT1-085", as: "opponentTamer" },
        ],
      },
    );
    await digivolveIntoArrester(twoColorsFromThreeTamers);
    expect(opponentBoardIds(twoColorsFromThreeTamers)).toEqual(["BT1-080", "BT1-085"]);
    expect(twoColorsFromThreeTamers.perm("opponentTamer").stack).toHaveLength(0);
  });

  it("places the Digimon at the bottom of the cards already stacked under the opponent's Tamer (Q2217)", async () => {
    const s = arresterBoard(
      {},
      {
        battleArea: [
          { card: "BT1-009", as: "placed" },
          { card: "BT1-085", as: "opponentTamer", under: [{ card: "BT1-013", as: "alreadyUnder" }] },
        ],
      },
    );
    const placedInstanceId = s.perm("placed").topCard.instanceId;
    await digivolveIntoArrester(s);

    expect(s.perm("opponentTamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      placedInstanceId,
      s.inst("alreadyUnder").instanceId,
    ]);
  });

  it("cannot place the Digimon under an opponent's Digimon that isn't affected by its effects (Q2218)", async () => {
    const immuneHost = arresterBoard(
      {},
      {
        battleArea: [
          { card: "BT1-009", as: "levelThree" },
          { card: "BT15-047", as: "kabuterimon", suspended: true },
        ],
      },
    );
    await digivolveIntoArrester(immuneHost);
    expect(opponentBoardIds(immuneHost)).toEqual(["BT1-009", "BT15-047"]);
    expect(immuneHost.perm("kabuterimon").stack).toHaveLength(0);

    const affectableHost = arresterBoard(
      {},
      {
        battleArea: [
          { card: "BT1-009", as: "levelThree" },
          { card: "BT15-047", as: "kabuterimon", suspended: false },
        ],
      },
    );
    await digivolveIntoArrester(affectableHost);
    expect(opponentBoardIds(affectableHost)).toEqual(["BT15-047"]);
    expect(affectableHost.perm("kabuterimon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("removes the placed Digimon from the battle area and trashes its own digivolution cards (Q4995)", async () => {
    const s = arresterBoard(
      {},
      {
        battleArea: [
          { card: "BT1-009", as: "placed", under: [{ card: "BT1-001", as: "placedEgg" }] },
          { card: "BT1-080", as: "host", under: [{ card: "BT1-013", as: "hostSource" }] },
        ],
      },
    );
    const placedPermanentId = s.perm("placed").permanentId;
    const placedInstanceId = s.perm("placed").topCard.instanceId;
    await digivolveIntoArrester(s);

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map(({ permanentId }) => permanentId)).not.toContain(placedPermanentId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      placedInstanceId,
      s.inst("hostSource").instanceId,
    ]);
    expect(opponent.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("placedEgg").instanceId]);
  });

  it("a Tamer does not gain the inherited effect of a Digimon placed under it (Q4996)", async () => {
    const s = arresterBoard(
      { battleArea: [{ card: "BT1-085", as: "ownTamer" }] },
      {
        battleArea: [
          { card: "BT12-038", as: "geo" },
          { card: "BT1-085", as: "opponentTamer" },
        ],
      },
    );
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    await digivolveIntoArrester(s);
    expect(s.perm("opponentTamer").stack.map(({ instanceId }) => instanceId)).toEqual([geoInstanceId]);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("opponentTamer"), "BT12-038")).toBe(false);

    s.state.turnSeat = 1;
    const arresterDP = s.perm("base").currentDP;
    await advance(s.engine).verb.suspend([s.perm("opponentTamer").permanentId]);
    await drainMicrotasks();
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(arresterDP);

    const digimonHost = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-083", as: "arresterOnBoard" }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "host", under: ["BT12-038"] },
            { card: "BT1-085", as: "opponentTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    digimonHost.state.turnSeat = 1;
    await digimonHost.ready();
    const controlDP = digimonHost.perm("arresterOnBoard").currentDP;
    await advance(digimonHost.engine).verb.suspend([digimonHost.perm("opponentTamer").permanentId]);
    await settle(() => digimonHost.perm("arresterOnBoard").currentDP === controlDP - 2000);
    expect(digimonHost.perm("arresterOnBoard").currentDP).toBe(controlDP - 2000);
  });

  it("a Tamer treated as a Digimon gains the inherited effect of a Digimon placed under it until it stops being a Digimon (Q4997)", async () => {
    const preferred: string[] = [];
    const s = arresterBoard(
      { battleArea: [{ card: "BT1-085", as: "ownTamer" }] },
      {
        battleArea: [{ card: "BT12-038", as: "geo" }],
        hand: [
          { card: "BT17-087", as: "marcus" },
          { card: "BT17-087", as: "secondMarcus" },
        ],
      },
      preferred,
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    await digivolveIntoArrester(s);
    const marcusId = s.perm("marcus").permanentId;
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([marcusId]);
    expect(s.perm("marcus").stack.map(({ instanceId }) => instanceId)).toEqual([geoInstanceId]);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(true);

    s.state.turnSeat = 1;
    const dpBeforeSuspend = s.perm("base").currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await settle(() => s.perm("base").currentDP === dpBeforeSuspend - 2000);
    expect(s.perm("base").currentDP).toBe(dpBeforeSuspend - 2000);

    await advance(s.engine).verb.unsuspend([marcusId]);
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(false);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(false);

    const dpAfterDigimonStatusEnds = s.perm("base").currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await drainMicrotasks();
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(dpAfterDigimonStatusEnds);

    // Control: a second Marcus's [On Play] makes the GeoGreymon host a Digimon again, so the
    // unchanged DP above comes from the lost Digimon status, not a spent [Once Per Turn].
    await advance(s.engine).verb.unsuspend([marcusId]);
    preferred.push(s.perm("marcus").topCard.instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(true);
    const dpBeforeRegrantedSuspend = s.perm("base").currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await settle(() => s.perm("base").currentDP === dpBeforeRegrantedSuspend - 2000);
    expect(s.perm("base").currentDP).toBe(dpBeforeRegrantedSuspend - 2000);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("attacks with the [End of Your Turn] effect even while this Digimon is suspended (Q4998)", async () => {
    async function endTurnWithSuspendedArrester(digivolutionCards: string[]): Promise<Setup> {
      const s = setupEngine(
        {
          0: {
            deck: FILLER,
            battleArea: [{ card: "BT12-083", as: "arrester", under: digivolutionCards }],
          },
          1: { deck: FILLER, security: ["BT1-009", "BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await advance(s.engine).verb.suspend([s.perm("arrester").permanentId]);
      await drainMicrotasks();
      expect(s.perm("arrester").isSuspended).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(0);
      await settle(() => s.events.some(({ kind }) => kind === "turnEnded"));
      await advance(s.engine).finishAttack();
      await turn;
      return s;
    }

    const fourSources = await endTurnWithSuspendedArrester(["BT1-009", "BT1-009", "BT1-009", "BT1-009"]);
    expect(observe(fourSources.engine).hasAttackedThisTurn(fourSources.perm("arrester"))).toBe(true);
    expect(fourSources.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
    expect(fourSources.state.players[1]!.security).toHaveLength(1);

    const threeSources = await endTurnWithSuspendedArrester(["BT1-009", "BT1-009", "BT1-009"]);
    expect(observe(threeSources.engine).hasAttackedThisTurn(threeSources.perm("arrester"))).toBe(false);
    expect(threeSources.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
    expect(threeSources.state.players[1]!.security).toHaveLength(2);
  });
});
