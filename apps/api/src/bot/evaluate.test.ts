import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition, type Seat } from "@aegis/shared";
import { enumerateMainPhaseCandidates } from "./candidates.js";
import { appraiseBlock, memoryPenalty, scoreCandidate } from "./evaluate.js";
import { createEvaluationPolicy } from "./policy.js";
import { BOT_PROFILES } from "./profiles.js";
import type { BotHandCard, BotUnit, BotView } from "./view.js";

/**
 * The competence checklist, asserted directly against the evaluation.
 *
 * Each test states a position and the judgement a competent player would make in it, so
 * a weight change that breaks the judgement fails here rather than silently degrading
 * the benchmark winrate.
 */

function unit(overrides: Partial<BotUnit> & { permanentId: string }): BotUnit {
  return {
    cardId: "BT1-010",
    definition: undefined,
    dp: 4_000,
    level: 4,
    suspended: false,
    inBreeding: false,
    keywords: [],
    canAttackPlayer: false,
    attackablePermanentIds: [],
    activatableEffects: [],
    ...overrides,
  };
}

function view(overrides: Partial<BotView> = {}): BotView {
  const board = overrides.board ?? [];
  return {
    seat: 1 as Seat,
    opponentSeat: 0 as Seat,
    phase: Phase.Main,
    turnSeat: 1 as Seat,
    gameOver: false,
    memory: 3,
    maxAffordable: 13,
    freeMemory: 3,
    hand: [],
    board,
    breeding: undefined,
    opponentBoard: [],
    securityCount: 5,
    opponentSecurityCount: 5,
    deckCount: 40,
    eggDeckCount: 4,
    trashCount: 0,
    readyAttackers: board.filter((candidate) => !candidate.suspended),
    ownFieldColors: new Set(["Red"]),
    ...overrides,
  };
}

function handCard(cardId: string, definition: BotHandCard["definition"]): BotHandCard {
  return { instanceId: `i-${cardId}`, cardId, definition, activatableEffects: [] };
}

const balanced = BOT_PROFILES.balanced;

function scoreOf(state: BotView, key: string, profile = balanced): number {
  const candidate = enumerateMainPhaseCandidates(state).find((entry) => entry.key === key);
  if (candidate === undefined) throw new Error(`no candidate ${key}; had ${enumerateMainPhaseCandidates(state).map((entry) => entry.key).join(", ")}`);
  return scoreCandidate(state, candidate, profile);
}

describe("attack evaluation", () => {
  it("treats an attack into an empty security stack as lethal", () => {
    const attacker = unit({ permanentId: "p1", canAttackPlayer: true });
    const empty = view({ board: [attacker], opponentSecurityCount: 0 });
    const guarded = view({ board: [attacker], opponentSecurityCount: 3 });

    expect(scoreOf(empty, "attackPlayer:p1")).toBeGreaterThan(100);
    expect(scoreOf(guarded, "attackPlayer:p1")).toBeLessThan(100);
  });

  it("refuses to attack into a Blocker that beats the attacker", () => {
    const attacker = unit({ permanentId: "p1", dp: 4_000, canAttackPlayer: true });
    const blocker = unit({ permanentId: "e1", dp: 9_000, level: 5, keywords: ["Blocker"] });
    const state = view({ board: [attacker], opponentBoard: [blocker] });

    expect(scoreOf(state, "attackPlayer:p1")).toBeLessThan(0);
  });

  it("prefers the biggest attacker, which survives security and blockers best", () => {
    const big = unit({ permanentId: "big", dp: 9_000, level: 5, canAttackPlayer: true });
    const small = unit({ permanentId: "small", dp: 2_000, level: 3, canAttackPlayer: true });
    const state = view({ board: [big, small] });

    expect(scoreOf(state, "attackPlayer:big")).toBeGreaterThan(scoreOf(state, "attackPlayer:small"));
  });

  it("does not claim lethal when any unsuspended Blocker can intercept", () => {
    // The blocker LOSES the battle, but it still steps in front, and a blocked attack
    // never checks security — so this cannot be the winning swing.
    const attacker = unit({ permanentId: "p1", dp: 4_000, canAttackPlayer: true });
    const chump = unit({ permanentId: "e1", dp: 3_000, level: 3, keywords: ["Blocker"] });
    const state = view({ board: [attacker], opponentBoard: [chump], opponentSecurityCount: 0 });

    expect(scoreOf(state, "attackPlayer:p1")).toBeLessThan(100);
  });

  it("claims lethal once enough attackers exist to exhaust the blockers", () => {
    const first = unit({ permanentId: "p1", dp: 4_000, canAttackPlayer: true });
    const second = unit({ permanentId: "p2", dp: 4_000, canAttackPlayer: true });
    const chump = unit({ permanentId: "e1", dp: 3_000, level: 3, keywords: ["Blocker"] });
    const state = view({
      board: [first, second],
      opponentBoard: [chump],
      opponentSecurityCount: 0,
    });

    expect(scoreOf(state, "attackPlayer:p1")).toBeGreaterThan(100);
  });

  it("ranks lethal attacks rather than leaving the choice to tie-break jitter", () => {
    const big = unit({ permanentId: "big", dp: 9_000, level: 5, canAttackPlayer: true });
    const small = unit({ permanentId: "small", dp: 2_000, level: 3, canAttackPlayer: true });
    const state = view({ board: [big, small], opponentSecurityCount: 0 });

    const gap = scoreOf(state, "attackPlayer:big") - scoreOf(state, "attackPlayer:small");
    // The jitter is +-0.01, so the ranking must separate the two by more than that.
    expect(gap).toBeGreaterThan(0.5);
  });

  it("prices the chump block into a normal security attack", () => {
    const attacker = unit({ permanentId: "p1", dp: 6_000, level: 5, canAttackPlayer: true });
    const chump = unit({ permanentId: "e1", dp: 3_000, level: 3, keywords: ["Blocker"] });
    const open = view({ board: [attacker] });
    const guarded = view({ board: [attacker], opponentBoard: [chump] });

    // A blocker that dies to the attacker is not a deterrent, but it does deny the
    // security check, so the attack cannot be worth exactly as much as an unopposed one.
    expect(scoreOf(guarded, "attackPlayer:p1")).not.toBeCloseTo(scoreOf(open, "attackPlayer:p1"), 5);
  });

  it("keeps bigger attackers preferable at every size", () => {
    // A floored risk factor would make the product risk x value start rising again past
    // some DP, flipping the preference back to the smallest body.
    const sizes = [2_000, 5_000, 9_000, 13_000, 17_000];
    const scores = sizes.map((dp) => {
      const attacker = unit({ permanentId: "p1", dp, level: 6, canAttackPlayer: true });
      return scoreOf(view({ board: [attacker] }), "attackPlayer:p1");
    });
    for (let index = 1; index < scores.length; index += 1) {
      expect(scores[index]!).toBeGreaterThan(scores[index - 1]!);
    }
  });

  it("never suicides an attacker into a bigger Digimon", () => {
    const attacker = unit({ permanentId: "p1", dp: 3_000, attackablePermanentIds: ["e1"] });
    const target = unit({ permanentId: "e1", dp: 8_000, level: 5 });
    const state = view({ board: [attacker], opponentBoard: [target] });

    expect(scoreOf(state, "attackDigimon:p1:e1")).toBeLessThan(0);
  });

  it("takes a favourable Digimon trade it wins outright", () => {
    const attacker = unit({ permanentId: "p1", dp: 9_000, level: 5, attackablePermanentIds: ["e1"] });
    const target = unit({ permanentId: "e1", dp: 4_000, level: 4 });
    const state = view({ board: [attacker], opponentBoard: [target] });

    expect(scoreOf(state, "attackDigimon:p1:e1")).toBeGreaterThan(0);
  });
});

describe("development evaluation", () => {
  const greymon = { cardId: "BT1-015", set: "BT1", nameEn: "Greymon", kinds: ["Digimon"], colors: ["Red"], level: 4, playCost: 4, dp: 4_000, evoCosts: [], maxCountInDeck: 4 } as unknown as BotHandCard["definition"];

  it("digivolves for a real gain in level and DP", () => {
    const base = unit({ permanentId: "p1", cardId: "BT1-010", dp: 2_000, level: 3 });
    const state = view({ board: [base], hand: [handCard("BT1-015", greymon)] });
    const candidate = enumerateMainPhaseCandidates(state).find((entry) => entry.kind === "digivolve");
    expect(candidate).toBeDefined();
    expect(scoreCandidate(state, candidate!, balanced)).toBeGreaterThan(0);
  });

  it("refuses a digivolution that gains neither level nor DP", () => {
    const base = unit({ permanentId: "p1", cardId: "BT1-010", dp: 9_000, level: 6 });
    const state = view({ board: [base], hand: [handCard("BT1-015", greymon)] });
    const candidate = enumerateMainPhaseCandidates(state).find((entry) => entry.kind === "digivolve");
    expect(candidate).toBeDefined();
    expect(scoreCandidate(state, candidate!, balanced)).toBeLessThan(0);
  });

  it("plays an Option at a discount while the opponent has nothing to answer", () => {
    const option = { cardId: "BT1-090", set: "BT1", nameEn: "Gravity Crush", kinds: ["Option"], colors: ["Red"], playCost: 2, dp: 0, evoCosts: [], maxCountInDeck: 1, optionColorRequirements: ["Red"] } as unknown as BotHandCard["definition"];
    const supporter = unit({ permanentId: "p1", definition: { kinds: ["Digimon"], colors: ["Red"] } as never });
    const idle = view({ board: [supporter], hand: [handCard("BT1-090", option)] });
    const contested = view({
      board: [supporter],
      hand: [handCard("BT1-090", option)],
      opponentBoard: [unit({ permanentId: "e1" })],
    });

    expect(scoreOf(contested, "play:i-BT1-090")).toBeGreaterThan(scoreOf(idle, "play:i-BT1-090"));
  });
});

describe("candidate legality", () => {
  // BT25-043 is a dual ["Digimon","Option"] card: it is played on its DIGIMON side, but it
  // still carries `optionColorRequirements: ["Yellow"]`, and the engine gates on that list
  // regardless of play mode. Gating on the play kind instead would offer this play against
  // a Red-only board and collect `color-requirement-unmet`.
  const dual = getCardDefinition("BT25-043");
  const redSupporter = unit({
    permanentId: "p1",
    cardId: "BT1-010",
    definition: getCardDefinition("BT1-010"),
  });

  it("withholds a dual Digimon/Option card whose printed color requirement is unmet", () => {
    const state = view({
      board: [redSupporter],
      hand: [handCard("BT25-043", dual)],
      memory: 10,
      freeMemory: 10,
      ownFieldColors: new Set(["Red"]),
    });
    const keys = enumerateMainPhaseCandidates(state).map((entry) => entry.key);
    expect(keys).not.toContain("play:i-BT25-043");
  });

  it("offers the same dual card once its color is on the board", () => {
    const state = view({
      board: [redSupporter],
      hand: [handCard("BT25-043", dual)],
      memory: 10,
      freeMemory: 10,
      ownFieldColors: new Set(["Red", "Yellow"]),
    });
    const keys = enumerateMainPhaseCandidates(state).map((entry) => entry.key);
    expect(keys).toContain("play:i-BT25-043");
  });
});

describe("decision candidate ranking", () => {
  it("ranks a removal-style board selection by the biggest opposing body", () => {
    const policy = createEvaluationPolicy({ profile: balanced, seed: 3 });
    const small = unit({ permanentId: "perm-e1", dp: 3_000, level: 3 });
    const large = unit({ permanentId: "perm-e2", dp: 11_000, level: 6 });
    const state = view({ opponentBoard: [small, large] });

    const intent = policy.answerDecision(state, {
      decisionId: "d1",
      seat: 1,
      kind: "chooseTargets",
      promptText: "Delete 1 of your opponent's Digimon",
      options: { candidateInstanceIds: ["perm-e1", "perm-e2"], min: 1, max: 1 },
    });

    expect(intent).toEqual({
      type: "respondDecision",
      decisionId: "d1",
      response: { kind: "chooseTargets", instanceIds: ["perm-e2"] },
    });
  });

  it("recognises a board candidate offered under its top card's instance id", () => {
    const policy = createEvaluationPolicy({ profile: balanced, seed: 3 });
    const small = unit({ permanentId: "perm-e1", topCardInstanceId: "inst-1", dp: 3_000, level: 3 });
    const large = unit({ permanentId: "perm-e2", topCardInstanceId: "inst-2", dp: 11_000, level: 6 });
    const state = view({ opponentBoard: [small, large] });

    const intent = policy.answerDecision(state, {
      decisionId: "d2",
      seat: 1,
      kind: "selectCards",
      promptText: "Select 1",
      options: { candidateInstanceIds: ["inst-1", "inst-2"], min: 1, max: 1 },
    });

    expect(intent).toEqual({
      type: "respondDecision",
      decisionId: "d2",
      response: { kind: "selectCards", instanceIds: ["inst-2"] },
    });
  });
});

describe("memory discipline", () => {
  it("charges far more for memory handed to the opponent than for memory we hold", () => {
    const state = view({ memory: 5, freeMemory: 5 });
    expect(memoryPenalty(state, 5, balanced)).toBeLessThan(memoryPenalty(state, 6, balanced));
    // The step from "the last free point" to "the first handed-over point" is a cliff,
    // not a slope: it also forfeits the rest of the turn.
    const withinStep = memoryPenalty(state, 5, balanced) - memoryPenalty(state, 4, balanced);
    const crossStep = memoryPenalty(state, 6, balanced) - memoryPenalty(state, 5, balanced);
    expect(crossStep).toBeGreaterThan(withinStep * 3);
  });

  it("charges more for overextending while attacks are still unspent", () => {
    const idle = view({ memory: 0, freeMemory: 0, board: [] });
    const armed = view({
      memory: 0,
      freeMemory: 0,
      board: [unit({ permanentId: "p1", canAttackPlayer: true })],
    });
    expect(memoryPenalty(armed, 3, balanced)).toBeGreaterThan(memoryPenalty(idle, 3, balanced));
  });

  it("passes the turn rather than taking an action worth less than nothing", () => {
    const policy = createEvaluationPolicy({ profile: balanced, seed: 1 });
    const attacker = unit({ permanentId: "p1", dp: 3_000, level: 3, canAttackPlayer: true });
    const wall = unit({ permanentId: "e1", dp: 12_000, level: 6, keywords: ["Blocker"] });
    const state = view({ board: [attacker], opponentBoard: [wall] });

    expect(policy.chooseMainAction(state)).toEqual({ type: "endPhase" });
  });
});

describe("blocking", () => {
  it("blocks to save the last security card even at the cost of the blocker", () => {
    const blocker = unit({ permanentId: "b1", dp: 3_000, level: 3, keywords: ["Blocker"] });
    const attacker = unit({ permanentId: "a1", dp: 9_000, level: 5 });
    const state = view({ board: [blocker], opponentBoard: [attacker], securityCount: 1 });

    expect(appraiseBlock(state, attacker, ["b1"], true, balanced)).toBeDefined();
  });

  it("holds a small blocker back while security is healthy", () => {
    const blocker = unit({ permanentId: "b1", dp: 3_000, level: 3, keywords: ["Blocker"] });
    const attacker = unit({ permanentId: "a1", dp: 12_000, level: 6 });
    const state = view({ board: [blocker], opponentBoard: [attacker], securityCount: 5 });

    expect(appraiseBlock(state, attacker, ["b1"], true, balanced)).toBeUndefined();
  });

  it("always blocks the attack that would end the game, on every profile", () => {
    // Security is empty: the next resolving attack wins. Holding the blocker is not a
    // risk preference at this point, it is losing.
    const blocker = unit({ permanentId: "b1", dp: 1_000, level: 3, keywords: ["Blocker"] });
    const attacker = unit({ permanentId: "a1", dp: 15_000, level: 7 });
    const state = view({ board: [blocker], opponentBoard: [attacker], securityCount: 0 });

    for (const profile of Object.values(BOT_PROFILES)) {
      expect(appraiseBlock(state, attacker, ["b1"], true, profile)).toEqual({
        blockerPermanentId: "b1",
        score: expect.any(Number),
      });
    }
  });

  it("is more willing to block on the defensive profile than the aggressive one", () => {
    const blocker = unit({ permanentId: "b1", dp: 4_000, level: 4, keywords: ["Blocker"] });
    const attacker = unit({ permanentId: "a1", dp: 6_000, level: 5 });
    const state = view({ board: [blocker], opponentBoard: [attacker], securityCount: 3 });

    expect(appraiseBlock(state, attacker, ["b1"], true, BOT_PROFILES.defensive)).toBeDefined();
    expect(appraiseBlock(state, attacker, ["b1"], true, BOT_PROFILES.aggressive)).toBeUndefined();
  });
});

describe("personalities", () => {
  it("differ only in weights, never in the code path taken", () => {
    const attacker = unit({ permanentId: "p1", dp: 4_000, canAttackPlayer: true });
    const blocker = unit({ permanentId: "e1", dp: 5_000, level: 4, keywords: ["Blocker"] });
    const state = view({ board: [attacker], opponentBoard: [blocker] });

    const aggressive = scoreOf(state, "attackPlayer:p1", BOT_PROFILES.aggressive);
    const defensive = scoreOf(state, "attackPlayer:p1", BOT_PROFILES.defensive);
    expect(aggressive).toBeGreaterThan(defensive);
  });

  it("is deterministic for a given seed", () => {
    const attacker = unit({ permanentId: "p1", dp: 4_000, canAttackPlayer: true });
    const state = view({ board: [attacker] });
    const first = createEvaluationPolicy({ profile: balanced, seed: 42 });
    const second = createEvaluationPolicy({ profile: balanced, seed: 42 });

    for (let step = 0; step < 5; step += 1) {
      expect(first.chooseMainAction(state)).toEqual(second.chooseMainAction(state));
    }
  });
});
