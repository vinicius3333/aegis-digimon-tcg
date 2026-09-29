import { describe, it, expect, beforeEach } from "vitest";
import { EffectTiming, Phase, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT22-007.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import "../BT9/BT9-047.js";
import "../BT1/BT1-105.js";
import "../BT3/BT3-101.js";
import "../AD1/AD1-004.js";
import "./BT22-079.js";

let seq = 0;

const MOTHER_EATER = "BT22-007";
const OTHER = "X-OTHER";

function makeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X-000",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: [],
    playCost: 0,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function instance(cardId: string, faceUp = false): CardInstance {
  seq += 1;
  return { instanceId: `i-${seq}`, cardId, ownerSeat: 0 as Seat, faceUp } as unknown as CardInstance;
}

function makeSource(self: Permanent, inBreeding: boolean): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: MOTHER_EATER,
    ownerSeat: 0 as Seat,
    definition: makeDefinition({ cardId: MOTHER_EATER, nameEn: "Mother Eater" }),
    permanent: () => self,
    isOnBattleArea: () => !inBreeding,
    isOnBreedingArea: () => inBreeding,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface Harness {
  ctx: EffectContext;
  placeTopCalls: number;
  playedInstanceIds: string[];
}

function makeHarness(opts: {
  stackSize: number;
  motherEatersInStack: number;
  eggTopIsMotherEater: boolean;
  inBreeding?: boolean;
  turnSeat?: Seat;
}): Harness {
  seq = 0;
  const stack: CardInstance[] = [];
  for (let i = 0; i < opts.motherEatersInStack; i++) stack.push(instance(MOTHER_EATER, true));
  while (stack.length < opts.stackSize) stack.push(instance(OTHER, true));
  const self = {
    permanentId: "self",
    controllerSeat: 0 as Seat,
    topCard: instance(MOTHER_EATER, true),
    stack,
    linked: [],
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: opts.inBreeding ?? true,
  } as unknown as Permanent;
  const eggDeck: CardInstance[] = [instance(opts.eggTopIsMotherEater ? MOTHER_EATER : OTHER, false)];
  const players = [
    {
      seat: 0,
      battleArea: opts.inBreeding === false ? [self] : [],
      breeding: opts.inBreeding === false ? undefined : self,
      security: [],
      hand: [],
      deck: [],
      trash: [],
      eggDeck,
    },
    { seat: 1, battleArea: [], security: [], hand: [], deck: [], trash: [], eggDeck: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: opts.turnSeat ?? 0 } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => (id === "self" ? self : undefined),
    definitionOf: (card) =>
      makeDefinition({ cardId: card.cardId, nameEn: card.cardId === MOTHER_EATER ? "Mother Eater" : "Other" }),
    linkMax: () => 1,
  };
  const h: Harness = { ctx: undefined as never, placeTopCalls: 0, playedInstanceIds: [] };
  const fx = {
    placeAsTopFromEggDeck: () => {
      h.placeTopCalls += 1;
      return eggDeck[0];
    },
    playInstances: async (ids: string[]) => {
      h.playedInstanceIds.push(...ids);
    },
    deletePermanent: async () => 0,
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  h.ctx = {
    source: makeSource(self, opts.inBreeding ?? true),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map<string, string>(),
  };
  return h;
}

async function runStartMain(h: Harness): Promise<void> {
  const module = getEffectModule("BT22-007")!;
  const effects = module.effectsForTiming(EffectTiming.OnStartMainPhase, h.ctx.source);
  for (const e of effects) {
    if (e.canTrigger(h.ctx)) await e.resolve(h.ctx);
  }
}

describe("BT22-007 — place-as-top + 10+-condition + play-from-own-stack", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("egg top [Mother Eater] + 10+ digivolution cards => place as TOP and play 3 from own stack", async () => {
    const h = makeHarness({ stackSize: 10, motherEatersInStack: 3, eggTopIsMotherEater: true });
    await runStartMain(h);
    expect(h.placeTopCalls).toBe(1);
    expect(h.playedInstanceIds.length).toBe(3);
  });

  it("with FEWER than 10 digivolution cards => the play-3 clause does NOT run (10+ gate)", async () => {
    const h = makeHarness({ stackSize: 9, motherEatersInStack: 3, eggTopIsMotherEater: true });
    await runStartMain(h);
    expect(h.placeTopCalls).toBe(1);
    expect(h.playedInstanceIds.length).toBe(0);
  });

  it("only 2 [Mother Eater]s in a 10+ stack => play those 2 (as many as possible, Q4859)", async () => {
    const h = makeHarness({ stackSize: 11, motherEatersInStack: 2, eggTopIsMotherEater: true });
    await runStartMain(h);
    expect(h.playedInstanceIds.length).toBe(2);
  });

  it("a NON-[Mother Eater] egg top is not placed as the top digivolution card (Q4856)", async () => {
    const h = makeHarness({ stackSize: 10, motherEatersInStack: 3, eggTopIsMotherEater: false });
    await runStartMain(h);
    expect(h.placeTopCalls).toBe(0);
  });

  it("the {Breeding} timed effect does NOT trigger for a BATTLE-AREA copy (breeding base guard)", async () => {
    const h = makeHarness({
      stackSize: 10,
      motherEatersInStack: 3,
      eggTopIsMotherEater: true,
      inBreeding: false,
    });
    await runStartMain(h);
    expect(h.placeTopCalls).toBe(0);
    expect(h.playedInstanceIds.length).toBe(0);
  });

  it("on the OPPONENT's turn the {Breeding}[Start of Your Main Phase] does not fire", async () => {
    const h = makeHarness({
      stackSize: 10,
      motherEatersInStack: 3,
      eggTopIsMotherEater: true,
      turnSeat: 1 as Seat,
    });
    await runStartMain(h);
    expect(h.placeTopCalls).toBe(0);
    expect(h.playedInstanceIds.length).toBe(0);
  });
});

describe("BT22-007 inherited leave-play replacement", () => {
  it("places the leaving Eater under this Digimon, not an arbitrary owned permanent", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    const watcher = inherited?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "instead",
      leaveCause: "otherThanYourEffect",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        includeToken: true,
        nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
      },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { filter: { useTriggerSource: true } },
      targetIsPermanent: true,
      underFilter: { isSelfRef: true },
      position: "bottom",
    });
  });

  it("replaces an opponent-effect deletion of an owned Eater with bottom placement under the breeding host", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-079", under: ["BT22-007"], as: "breedingHost" },
          battleArea: [{ card: "BT22-080", as: "leavingEater" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(advance(s.engine).ledgers.subTriggers.replacementsFor("wouldLeavePlay")).toHaveLength(1);
    const leavingId = s.inst("leavingEater").instanceId;

    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      await advance(s.engine).verb.deletePermanent([s.perm("leavingEater").permanentId], "byEffect");
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === leavingId)).toBe(false);
    expect(s.perm("breedingHost").stack[0]?.instanceId).toBe(leavingId);
  });
});

describe("BT22-007 battle-area clauses", () => {
  it("reveals an accepted Mother Eater as the new top card and leaves a declined card face down", async () => {
    const accepted = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", as: "mother" },
          eggDeck: [{ card: "BT22-007", as: "acceptedEgg", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    await advance(accepted.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => accepted.state.players[0]!.eggDeck.length === 0);
    expect(accepted.state.players[0]!.breeding?.stack.at(-1)?.instanceId).toBe(accepted.inst("acceptedEgg").instanceId);
    expect(accepted.state.players[0]!.breeding?.stack.at(-1)?.faceUp).toBe(true);

    const declined = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", as: "mother" },
          eggDeck: [{ card: "BT22-007", as: "declinedEgg", faceUp: false }],
        },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    expect(declined.state.players[0]!.eggDeck.map((card) => card.instanceId)).toEqual([
      declined.inst("declinedEgg").instanceId,
    ]);
    expect(declined.inst("declinedEgg").faceUp).toBe(false);
  });

  it("does not play Mother Eaters while the opponent's Pomumon blocks effect plays", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: "BT22-007",
            as: "mother",
            under: [
              "BT22-007",
              "BT22-007",
              "BT22-007",
              "BT1-001",
              "BT1-002",
              "BT1-003",
              "BT1-004",
              "BT1-005",
              "BT1-006",
              "BT1-007",
            ],
          },
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("mother").stack.filter((card) => card.cardId === "BT22-007")).toHaveLength(3);
  });

  it("does not fire On Play when Mother Eater is hatched", async () => {
    const s = setupEngine({
      0: { eggDeck: [{ card: "BT22-007", as: "egg" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-007");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("opponent").permanentId,
    ]);
  });

  it("prevents Piercing when the inherited replacement prevents battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-079", under: ["BT22-007"], as: "motherHost" },
          battleArea: [{ card: "BT22-079", as: "defender", suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "AD1-004", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const defenderId = s.inst("defender").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("motherHost").stack.some((card) => card.instanceId === defenderId));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === defenderId)).toBe(false);
  });

  it("treats owned Mother Eaters as 16000 DP while the source is in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-007", as: "breedingSource" },
        battleArea: [{ card: "BT22-007", as: "battleMother" }],
      },
    });
    await s.ready();
    await advance(s.engine).recompute();

    expect(s.perm("battleMother").currentDP).toBe(16000);
  });

  it("deletes exactly one opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: "BT22-007",
            as: "mother",
            under: [
              "BT22-007",
              "BT1-001",
              "BT1-002",
              "BT1-003",
              "BT1-004",
              "BT1-005",
              "BT1-006",
              "BT1-007",
              "BT1-008",
              "BT1-009",
            ],
          },
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});

const MOTHER_EATER_CARD = "BT22-007";
const FILLER_UNDER = ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"];

function motherEaterStack(motherEaters: number, total = 10): CardSpec[] {
  const stack: CardSpec[] = Array.from({ length: motherEaters }, (_, index) => ({
    card: MOTHER_EATER_CARD,
    as: `stackMother${index}`,
  }));
  for (let index = 0; stack.length < total; index += 1) stack.push(FILLER_UNDER[index % FILLER_UNDER.length]!);
  return stack;
}

function battleMotherEaterCount(s: EngineSetup): number {
  return s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === MOTHER_EATER_CARD).length;
}

describe("BT22-007 Mother Eater — KB Q&A rulings", () => {
  it("activates {Breeding} effects only while the card is in the breeding area (Q4855)", async () => {
    const inBattleArea = setupEngine(
      {
        0: {
          battleArea: [{ card: MOTHER_EATER_CARD, as: "battleMother", dp: 5000, under: motherEaterStack(3) }],
          eggDeck: [{ card: MOTHER_EATER_CARD, as: "egg", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await inBattleArea.ready();
    await advance(inBattleArea.engine).recompute();
    expect(inBattleArea.perm("battleMother").currentDP).toBe(5000);
    await advance(inBattleArea.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle();
    expect(inBattleArea.state.players[0]!.eggDeck.map((card) => card.instanceId)).toEqual([
      inBattleArea.inst("egg").instanceId,
    ]);
    expect(inBattleArea.state.players[0]!.battleArea).toHaveLength(1);

    const inBreeding = setupEngine(
      {
        0: {
          breeding: { card: MOTHER_EATER_CARD, as: "breedingMother", under: motherEaterStack(3) },
          eggDeck: [{ card: MOTHER_EATER_CARD, as: "egg", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await inBreeding.ready();
    await advance(inBreeding.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => battleMotherEaterCount(inBreeding) === 3);
    expect(inBreeding.state.players[0]!.eggDeck).toHaveLength(0);
    expect(battleMotherEaterCount(inBreeding)).toBe(3);
  });

  it("returns a looked-at card that is not placed to the Digi-Egg deck face down (Q4857)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: MOTHER_EATER_CARD, as: "mother" },
          eggDeck: [
            { card: MOTHER_EATER_CARD, as: "firstEgg", faceUp: false },
            { card: MOTHER_EATER_CARD, as: "secondEgg", faceUp: false },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle();

    expect(s.state.players[0]!.eggDeck.map((card) => card.instanceId)).toEqual([
      s.inst("firstEgg").instanceId,
      s.inst("secondEgg").instanceId,
    ]);
    expect(s.state.players[0]!.eggDeck.every((card) => !card.faceUp)).toBe(true);
    expect(s.perm("mother").stack).toHaveLength(0);

    const accepted = setupEngine(
      {
        0: {
          breeding: { card: MOTHER_EATER_CARD, as: "mother" },
          eggDeck: [
            { card: MOTHER_EATER_CARD, as: "firstEgg", faceUp: false },
            { card: MOTHER_EATER_CARD, as: "secondEgg", faceUp: false },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    await advance(accepted.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => accepted.perm("mother").stack.length === 1);
    expect(accepted.state.players[0]!.eggDeck).toHaveLength(1);
  });

  it("plays 3 Mother Eaters from a 10+ digivolution stack even with an empty Digi-Egg deck (Q4858)", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: MOTHER_EATER_CARD, as: "mother", under: motherEaterStack(3) }, eggDeck: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => battleMotherEaterCount(s) === 3);

    expect(battleMotherEaterCount(s)).toBe(3);
    expect(s.perm("mother").stack.filter((card) => card.cardId === MOTHER_EATER_CARD)).toHaveLength(0);
  });

  it("must play all 3 Mother Eaters when 3 are available, not just 2 (Q4860)", async () => {
    const exactlyThree = setupEngine(
      {
        0: { breeding: { card: MOTHER_EATER_CARD, as: "mother", under: motherEaterStack(3) }, eggDeck: [] },
      },
      { autoAcceptOptional: true },
    );
    await exactlyThree.ready();
    await advance(exactlyThree.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => battleMotherEaterCount(exactlyThree) === 3);
    expect(battleMotherEaterCount(exactlyThree)).toBe(3);
    expect(
      exactlyThree.decisions.filter(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets"),
    ).toEqual([]);

    const fourAvailable = setupEngine(
      {
        0: { breeding: { card: MOTHER_EATER_CARD, as: "mother", under: motherEaterStack(4) }, eggDeck: [] },
      },
      { autoAcceptOptional: true },
    );
    await fourAvailable.ready();
    void advance(fourAvailable.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => fourAvailable.decisions.some(({ req }) => req.kind === "selectCards"));
    const selection = fourAvailable.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(selection.options).toMatchObject({ min: 3, max: 3 });
    const motherIds = [0, 1, 2].map((index) => fourAvailable.inst(`stackMother${index}`).instanceId);

    const onlyTwo = fourAvailable.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: motherIds.slice(0, 2) },
    });
    expect(onlyTwo.ok).toBe(false);
    expect(battleMotherEaterCount(fourAvailable)).toBe(0);

    expect(
      fourAvailable.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: motherIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => battleMotherEaterCount(fourAvailable) === 3);
    expect(battleMotherEaterCount(fourAvailable)).toBe(3);
  });

  it("cannot play Mother Eaters from its digivolution cards while the opponent has Pomumon (Q4861)", async () => {
    const withPomumon = setupEngine(
      {
        0: { breeding: { card: MOTHER_EATER_CARD, as: "mother", under: motherEaterStack(3) } },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withPomumon.ready();
    await withPomumon.engine.recomputeContinuousEffects();
    await advance(withPomumon.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle();
    expect(battleMotherEaterCount(withPomumon)).toBe(0);
    expect(withPomumon.perm("mother").stack.filter((card) => card.cardId === MOTHER_EATER_CARD)).toHaveLength(3);

    const withoutPomumon = setupEngine(
      {
        0: { breeding: { card: MOTHER_EATER_CARD, as: "mother", under: motherEaterStack(3) } },
        1: { battleArea: [{ card: "BT1-009", as: "notPomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withoutPomumon.ready();
    await advance(withoutPomumon.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => battleMotherEaterCount(withoutPomumon) === 3);
    expect(battleMotherEaterCount(withoutPomumon)).toBe(3);
  });

  it("does not trigger [On Play] when Mother Eater is hatched in the breeding area (Q4862)", async () => {
    const hatched = setupEngine(
      {
        0: { eggDeck: [{ card: MOTHER_EATER_CARD, as: "egg" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    hatched.state.phase = Phase.Breeding;
    await hatched.ready();
    expect(hatched.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => hatched.state.players[0]!.breeding?.topCard?.cardId === MOTHER_EATER_CARD);
    await settle();
    expect(hatched.state.players[0]!.breeding?.topCard?.cardId).toBe(MOTHER_EATER_CARD);
    expect(hatched.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      hatched.perm("opponent").permanentId,
    ]);
    expect(hatched.state.players[1]!.trash).toHaveLength(0);

    const played = setupEngine(
      {
        0: { breeding: { card: MOTHER_EATER_CARD, as: "mother", under: motherEaterStack(1) } },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await played.ready();
    await advance(played.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => played.state.players[1]!.battleArea.length === 0);
    expect(played.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("stops the attacker's <Piercing> when the inherited effect places the battling Eater in digivolution cards (Q4863)", async () => {
    async function attackEaterWithPiercing(breedingUnder: string[]) {
      const s = setupEngine(
        {
          0: {
            breeding: { card: "BT22-079", under: breedingUnder, as: "breedingHost" },
            battleArea: [{ card: "BT22-079", as: "defender", suspended: true }],
            security: ["BT1-009"],
          },
          1: { battleArea: [{ card: "AD1-004", as: "piercingAttacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("piercingAttacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      const defenderId = s.inst("defender").instanceId;
      await settle(
        () => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === defenderId),
      );
      await settle();
      return { s, defenderId };
    }

    const withMotherEater = await attackEaterWithPiercing([MOTHER_EATER_CARD]);
    expect(
      withMotherEater.s.perm("breedingHost").stack.some((card) => card.instanceId === withMotherEater.defenderId),
    ).toBe(true);
    expect(
      withMotherEater.s.state.players[0]!.trash.some((card) => card.instanceId === withMotherEater.defenderId),
    ).toBe(false);
    expect(withMotherEater.s.state.players[0]!.security).toHaveLength(1);

    const withoutMotherEater = await attackEaterWithPiercing([]);
    expect(
      withoutMotherEater.s.state.players[0]!.trash.some((card) => card.instanceId === withoutMotherEater.defenderId),
    ).toBe(true);
    expect(withoutMotherEater.s.state.players[0]!.security).toHaveLength(0);
  });

  it("applies a -3000 DP effect on top of the 16000 DP treatment, leaving 13000 DP (Q4864)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-047", as: "yellowDigimon" }],
          hand: [{ card: "BT3-101", as: "minusDpOption" }],
        },
        1: {
          breeding: { card: MOTHER_EATER_CARD, as: "breedingSource" },
          battleArea: [{ card: MOTHER_EATER_CARD, as: "battleMother" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).recompute();
    expect(s.perm("battleMother").currentDP).toBe(16000);

    const optionId = s.inst("minusDpOption").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    await advance(s.engine).recompute();

    expect(s.perm("battleMother").currentDP).toBe(13000);
  });

  // Engine gaps: a battle-area Digi-Egg with no printed DP is not an effect-targetable Digimon,
  // and a continuous base-DP treatment always outranks a later triggered one (modifiers.ts baseDpOf).
  it.fails("lets a later 'original DP is 3000' effect override the 16000 DP treatment (Q4865)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-047", as: "yellowDigimon" }],
          hand: [{ card: "BT1-105", as: "blastFire" }],
        },
        1: {
          breeding: { card: MOTHER_EATER_CARD, as: "breedingSource" },
          battleArea: [{ card: MOTHER_EATER_CARD, as: "battleMother" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).recompute();
    expect(s.perm("battleMother").currentDP).toBe(16000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blastFire").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastFire").instanceId));
    await advance(s.engine).recompute();
    expect(s.perm("battleMother").currentDP).toBe(3000);
  });
});
