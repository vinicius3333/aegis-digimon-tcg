import { describe, it, expect, beforeEach } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT22-007.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

/**
 * A3 for BT22-007's {Breeding}[Start of Your Main Phase] cluster (KB BT22-007; documented behavior):
 *  - place-as-TOP-from-egg-deck: the Digi-Egg-deck top, IF a [Mother Eater], is placed (revealed)
 *    as this Digimon's TOP digivolution card (placeAsTopFromEggDeck; Q4856).
 *  - raw-10+-digivolution condition: the play-3 tail runs only when this Digimon has 10+
 *    digivolution cards (selfDigivolutionCountAtLeast 10; Q4858).
 *  - play-from-own-digivolution-cards: play 3 (as many as possible, up to 3) [Mother Eater]s from
 *    THIS card's OWN digivolution stack (fromOwnDigivolutionStack; Q4859/Q4860).
 *
 * Driven through the REAL interpreter (real runPlaceUnder asTop, real evaluateCondition for the
 * 10+ gate, real PlayWithoutCost own-stack path) with a fake fx recording the verbs.
 *
 * FAILS-WHEN-REVERTED: drop below 10 digivolution cards (or force the 10+ condition false) => the
 * play-3 clause never runs (no playInstances of [Mother Eater]).
 */

let seq = 0;

const MOTHER_EATER = "BT22-007"; // [Mother Eater]
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
    // 3 [Mother Eater]s played from this card's own stack (Q4860: exactly 3 when 3 are available).
    expect(h.playedInstanceIds.length).toBe(3);
  });

  it("with FEWER than 10 digivolution cards => the play-3 clause does NOT run (10+ gate)", async () => {
    const h = makeHarness({ stackSize: 9, motherEatersInStack: 3, eggTopIsMotherEater: true });
    await runStartMain(h);
    expect(h.placeTopCalls).toBe(1); // the place-as-top still happens (egg top is Mother Eater)
    // FAILS-WHEN-REVERTED: make the >=10 condition always-true and these 3 wrongly play.
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
    // In the battle area the {Breeding} base guard is false => nothing fires.
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
    // The LEAVING Digimon is what moves, and it lands under THIS card — not the other way
    // round, and not under an arbitrary permanent the controller owns.
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
    expect(s.perm("breedingHost").stack.at(-1)?.instanceId).toBe(leavingId);
  });
});

describe("BT22-007 battle-area clauses", () => {
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
        0: { battleArea: [{ card: "BT22-007", as: "mother" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mother"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
