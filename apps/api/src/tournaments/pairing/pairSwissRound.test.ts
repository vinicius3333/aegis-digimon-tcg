import { describe, expect, it } from "vitest";
import { MAX_SEARCH_STEPS, type PairingParticipant, pairSwissRound, type SwissPairingResult } from "./index.js";

function participant(id: string, overrides: Partial<Omit<PairingParticipant, "id">> = {}): PairingParticipant {
  return {
    id,
    seed: overrides.seed ?? null,
    points: overrides.points ?? 0,
    opponentIds: overrides.opponentIds ?? [],
    byeCount: overrides.byeCount ?? 0,
  };
}

function pairOrFail(input: Parameters<typeof pairSwissRound>[0]): SwissPairingResult {
  const outcome = pairSwissRound(input);
  if (!outcome.ok) throw new Error(`Pairing failed: ${outcome.error.code} ${outcome.error.message}`);
  return outcome.result;
}

describe("input validation", () => {
  it("rejects an empty field", () => {
    const outcome = pairSwissRound({ participants: [], roundNumber: 1, seed: "s" });
    expect(outcome).toMatchObject({ ok: false, error: { code: "no_participants" } });
  });

  it("rejects duplicate participants", () => {
    const outcome = pairSwissRound({
      participants: [participant("a"), participant("a")],
      roundNumber: 1,
      seed: "s",
    });
    expect(outcome).toMatchObject({ ok: false, error: { code: "duplicate_participant" } });
  });

  it("rejects a non-positive round number", () => {
    const outcome = pairSwissRound({
      participants: [participant("a"), participant("b")],
      roundNumber: 0,
      seed: "s",
    });
    expect(outcome).toMatchObject({ ok: false, error: { code: "invalid_round_number" } });
  });
});

describe("round 1", () => {
  const roster = ["a", "b", "c", "d", "e", "f"].map((id, index) => participant(id, { seed: index + 1 }));

  it("pairs from a shuffle derived from the seed string", () => {
    const first = pairOrFail({ participants: roster, roundNumber: 1, seed: "tournament-1" });
    const same = pairOrFail({ participants: roster, roundNumber: 1, seed: "tournament-1" });
    const other = pairOrFail({ participants: roster, roundNumber: 1, seed: "tournament-2" });

    expect(same).toEqual(first);
    expect(other).not.toEqual(first);
    expect(first.pairings).toHaveLength(3);
    expect(first.bye).toBeNull();
    expect(first.pairings.every((pairing) => pairing.reason === "same_score")).toBe(true);
  });

  it("produces the same round however the caller ordered the roster", () => {
    const forward = pairOrFail({ participants: roster, roundNumber: 1, seed: "t" });

    const permutations = [
      [...roster].reverse(),
      [3, 0, 5, 1, 4, 2].map((index) => roster[index] as PairingParticipant),
      [2, 4, 1, 5, 0, 3].map((index) => roster[index] as PairingParticipant),
    ];
    for (const permutation of permutations) {
      const permuted = pairOrFail({ participants: permutation, roundNumber: 1, seed: "t" });
      expect(permuted.pairings).toEqual(forward.pairings);
      expect(permuted.bye).toEqual(forward.bye);
    }
  });
});

describe("byes", () => {
  it("gives the odd participant a bye and nobody else", () => {
    const result = pairOrFail({
      participants: [participant("a"), participant("b"), participant("c")],
      roundNumber: 1,
      seed: "s",
    });

    expect(result.pairings).toHaveLength(1);
    expect(result.bye).not.toBeNull();
  });

  it("never repeats a bye while an eligible participant has none", () => {
    const participants = [
      participant("a", { seed: 1, points: 6, byeCount: 1 }),
      participant("b", { seed: 2, points: 3, byeCount: 1 }),
      participant("c", { seed: 3, points: 0, byeCount: 1 }),
      participant("d", { seed: 4, points: 0, byeCount: 0 }),
      participant("e", { seed: 5, points: 0, byeCount: 1 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 3, seed: "s" });

    expect(result.bye).toEqual({ participantId: "d", reason: "bye_no_prior_bye" });
  });

  it("gives the bye to the lowest-ranked participant without one", () => {
    const participants = [
      participant("top", { seed: 1, points: 6 }),
      participant("middle", { seed: 2, points: 3 }),
      participant("bottom", { seed: 3, points: 0 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 2, seed: "s" });

    expect(result.bye).toEqual({ participantId: "bottom", reason: "bye_no_prior_bye" });
  });

  it("labels a repeated bye when everyone already had one", () => {
    const participants = [
      participant("a", { seed: 1, points: 6, byeCount: 1 }),
      participant("b", { seed: 2, points: 3, byeCount: 1 }),
      participant("c", { seed: 3, points: 0, byeCount: 2 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 3, seed: "s" });

    // "c" has the most byes, so the fewest-byes rule sends it to "b" instead.
    expect(result.bye).toEqual({ participantId: "b", reason: "bye_repeat" });
  });
});

describe("score groups and pair-down", () => {
  it("pairs inside a score group and labels it same_score", () => {
    const participants = [
      participant("a", { seed: 1, points: 3 }),
      participant("b", { seed: 2, points: 3 }),
      participant("c", { seed: 3, points: 0 }),
      participant("d", { seed: 4, points: 0 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 2, seed: "s" });

    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "b", reason: "same_score" },
      { participant0Id: "c", participant1Id: "d", reason: "same_score" },
    ]);
    expect(result.pairDownCount).toBe(0);
  });

  // Golden pair-down: the 3-point group has an odd size, so its lowest-ranked
  // member ("c", seed 3) drops to the top of the 0-point group ("d", seed 4).
  it("pairs the lowest of an odd group down to the top of the next", () => {
    const participants = [
      participant("a", { seed: 1, points: 3 }),
      participant("b", { seed: 2, points: 3 }),
      participant("c", { seed: 3, points: 3 }),
      participant("d", { seed: 4, points: 0 }),
      participant("e", { seed: 5, points: 0 }),
      participant("f", { seed: 6, points: 0 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 2, seed: "s" });

    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "b", reason: "same_score" },
      { participant0Id: "c", participant1Id: "d", reason: "pair_down" },
      { participant0Id: "e", participant1Id: "f", reason: "same_score" },
    ]);
    expect(result.pairDownCount).toBe(1);
  });

  // Regression, review finding 4: nearest-neighbour pairing alone emits
  // a-b (0) + c-e (6) + d-f (6) = 12 because c and d have met. Spending the
  // top pair on a pair-down instead costs 6 in total.
  it("prefers the assignment with the smaller total score difference", () => {
    const participants = [
      participant("a", { seed: 1, points: 9 }),
      participant("b", { seed: 2, points: 9 }),
      participant("c", { seed: 3, points: 6, opponentIds: ["d"] }),
      participant("d", { seed: 4, points: 6, opponentIds: ["c"] }),
      participant("e", { seed: 5, points: 0 }),
      participant("f", { seed: 6, points: 0 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 3, seed: "s" });

    expect(result.rematchCount).toBe(0);
    expect(result.scoreDifference).toBe(6);
    expect(result.scoreDifferenceOptimal).toBe(true);
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "c", reason: "pair_down" },
      { participant0Id: "b", participant1Id: "d", reason: "pair_down" },
      { participant0Id: "e", participant1Id: "f", reason: "same_score" },
    ]);
  });

  it("orders equal points by seed, and seedless participants last", () => {
    const participants = [
      participant("noseed", { seed: null, points: 3 }),
      participant("late", { seed: 9, points: 3 }),
      participant("early", { seed: 2, points: 3 }),
      participant("mid", { seed: 5, points: 3 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 2, seed: "s" });

    expect(result.pairings).toEqual([
      { participant0Id: "early", participant1Id: "mid", reason: "same_score" },
      { participant0Id: "late", participant1Id: "noseed", reason: "same_score" },
    ]);
  });
});

describe("rematch avoidance", () => {
  // Regression, review finding 1: the bye used to be committed before pairing,
  // so a bye handed to the lowest-ranked player stranded the top three (who
  // have all met) with a forced rematch. Any of a, b or c as the bye gives a
  // clean round; the pairer must find one instead of relaxing.
  it("moves the bye rather than accept an avoidable rematch", () => {
    const participants = [
      participant("a", { seed: 1, points: 6, opponentIds: ["b", "c"] }),
      participant("b", { seed: 2, points: 6, opponentIds: ["a", "c"] }),
      participant("c", { seed: 3, points: 6, opponentIds: ["a", "b"] }),
      participant("d", { seed: 4, points: 3 }),
      participant("e", { seed: 5, points: 0 }),
    ];

    const result = pairOrFail({ participants, roundNumber: 4, seed: "s" });

    expect(result.rematchCount).toBe(0);
    expect(result.rematchRelaxed).toBe(false);
    // "c" is the lowest-ranked bye that admits a rematch-free round.
    expect(result.bye).toEqual({ participantId: "c", reason: "bye_no_prior_bye" });
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "d", reason: "pair_down" },
      { participant0Id: "b", participant1Id: "e", reason: "pair_down" },
    ]);
  });

  // Regression, review finding 2: the old two-pass search returned the first
  // complete assignment once rematches were allowed. Pairing a-b first (both
  // fresh to everyone) strands the {c,d,e,f} clique with two rematches; using
  // a and b to absorb two clique members leaves only one.
  it("uses the fewest rematches possible, not the first assignment found", () => {
    const clique = ["c", "d", "e", "f"];
    const participants = [
      participant("a", { seed: 1, points: 3 }),
      participant("b", { seed: 2, points: 3 }),
      ...clique.map((id, index) =>
        participant(id, {
          seed: index + 3,
          points: 3,
          opponentIds: clique.filter((other) => other !== id),
        }),
      ),
    ];

    const result = pairOrFail({ participants, roundNumber: 4, seed: "s" });

    expect(result.rematchCount).toBe(1);
    expect(result.rematchRelaxed).toBe(true);
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "c", reason: "same_score" },
      { participant0Id: "b", participant1Id: "d", reason: "same_score" },
      { participant0Id: "e", participant1Id: "f", reason: "rematch_unavoidable" },
    ]);
  });

  it("prefers a fresh opponent over a rematch inside the same group", () => {
    const participants = [
      participant("a", { seed: 1, points: 3, opponentIds: ["b"] }),
      participant("b", { seed: 2, points: 3, opponentIds: ["a"] }),
      participant("c", { seed: 3, points: 3, opponentIds: ["d"] }),
      participant("d", { seed: 4, points: 3, opponentIds: ["c"] }),
    ];

    const result = pairOrFail({ participants, roundNumber: 2, seed: "s" });

    expect(result.rematchCount).toBe(0);
    expect(result.rematchRelaxed).toBe(false);
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "c", reason: "same_score" },
      { participant0Id: "b", participant1Id: "d", reason: "same_score" },
    ]);
  });

  it("backtracks rather than accepting an avoidable rematch", () => {
    // Greedy would pair a-b first and strand c with d, whom c already met.
    const participants = [
      participant("a", { seed: 1, points: 3, opponentIds: [] }),
      participant("b", { seed: 2, points: 3, opponentIds: ["c"] }),
      participant("c", { seed: 3, points: 3, opponentIds: ["b", "d"] }),
      participant("d", { seed: 4, points: 3, opponentIds: ["c"] }),
    ];

    const result = pairOrFail({ participants, roundNumber: 3, seed: "s" });

    expect(result.rematchCount).toBe(0);
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "c", reason: "same_score" },
      { participant0Id: "b", participant1Id: "d", reason: "same_score" },
    ]);
  });

  // Forced rematch: a 4-player round 3 where every pair has already met, which
  // is exactly what happens after a full round robin among four players.
  it("relaxes rematch avoidance only when no rematch-free round exists", () => {
    const everyone = ["a", "b", "c", "d"];
    const participants = everyone.map((id, index) =>
      participant(id, {
        seed: index + 1,
        points: 3,
        opponentIds: everyone.filter((other) => other !== id),
      }),
    );

    const result = pairOrFail({ participants, roundNumber: 4, seed: "s" });

    expect(result.rematchRelaxed).toBe(true);
    expect(result.rematchCount).toBe(2);
    expect(result.pairings.every((pairing) => pairing.reason === "rematch_unavoidable")).toBe(true);
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "b", reason: "rematch_unavoidable" },
      { participant0Id: "c", participant1Id: "d", reason: "rematch_unavoidable" },
    ]);
  });

  it("relaxes only the pairs that need it", () => {
    // a, b, c and d have all met each other, so two of them must be paired
    // together; e and f are fresh. The relaxed search still prefers fresh
    // opponents, so it spends its pair-downs first and leaves exactly one
    // rematch instead of two.
    const participants = [
      participant("a", { seed: 1, points: 3, opponentIds: ["b", "c", "d"] }),
      participant("b", { seed: 2, points: 3, opponentIds: ["a", "c", "d"] }),
      participant("c", { seed: 3, points: 3, opponentIds: ["a", "b", "d"] }),
      participant("d", { seed: 4, points: 3, opponentIds: ["a", "b", "c"] }),
      participant("e", { seed: 5, points: 0, opponentIds: [] }),
      participant("f", { seed: 6, points: 0, opponentIds: [] }),
    ];

    const result = pairOrFail({ participants, roundNumber: 4, seed: "s" });

    expect(result.rematchRelaxed).toBe(true);
    expect(result.rematchCount).toBe(1);
    expect(result.pairings).toEqual([
      { participant0Id: "a", participant1Id: "e", reason: "pair_down" },
      { participant0Id: "b", participant1Id: "f", reason: "pair_down" },
      { participant0Id: "c", participant1Id: "d", reason: "rematch_unavoidable" },
    ]);
  });
});

describe("determinism and performance", () => {
  it("returns identical output for identical input", () => {
    const participants = Array.from({ length: 33 }, (_, index) =>
      participant(`p${index}`, {
        seed: index + 1,
        points: (index * 3) % 10,
        opponentIds: [`p${(index + 1) % 33}`],
        byeCount: index % 7 === 0 ? 1 : 0,
      }),
    );
    const input = { participants, roundNumber: 4, seed: "deterministic" };

    expect(pairSwissRound(input)).toEqual(pairSwissRound(input));
  });

  it("pairs 128 participants in well under a second", () => {
    const participants = Array.from({ length: 128 }, (_, index) =>
      participant(`p${index}`, {
        seed: index + 1,
        points: (index % 8) * 3,
        // Six prior rounds' worth of opponents each, the round-7 worst case.
        opponentIds: Array.from({ length: 6 }, (_unused, round) => `p${(index + round * 17 + 1) % 128}`),
      }),
    );

    const startedAt = performance.now();
    const result = pairOrFail({ participants, roundNumber: 7, seed: "perf" });
    const elapsedMs = performance.now() - startedAt;

    // Generous bound: the plan's target is under 1s, asserted at 2s so CI noise
    // never turns a passing pairer red. Actual timing is logged for tracking.
    console.log(
      `[perf] 128-participant round paired in ${elapsedMs.toFixed(1)}ms ` +
        `(${result.searchSteps} search steps, ${result.rematchCount} rematches)`,
    );
    expect(result.pairings).toHaveLength(64);
    expect(elapsedMs).toBeLessThan(2000);
  });

  // Not a budget-exhaustion case: with every candidate a rematch, the deepening
  // levels below the answer fail instantly (no fresh candidate exists to try),
  // so the search reaches its assignment in a few dozen steps. This pins the
  // real behaviour and the honest counters.
  //
  // Residual, accepted and documented: a pathological mid-size field could burn
  // the whole feasibility budget before finding a rematch-free assignment and
  // then report a relaxation that was not strictly necessary. `budgetExhausted`
  // is how a caller detects that; no realistic field reaches it.
  it("stays fast and honest when every pair is a rematch", () => {
    const ids = Array.from({ length: 128 }, (_unused, index) => `p${index}`);
    const participants = ids.map((id, index) =>
      participant(id, {
        seed: index + 1,
        points: (index % 8) * 3,
        opponentIds: ids.filter((other) => other !== id),
      }),
    );

    const startedAt = performance.now();
    const result = pairOrFail({ participants, roundNumber: 7, seed: "saturated" });
    const elapsedMs = performance.now() - startedAt;

    console.log(
      `[perf] saturated 128-participant round paired in ${elapsedMs.toFixed(1)}ms ` +
        `(${result.searchSteps} search steps)`,
    );
    expect(result.pairings).toHaveLength(64);
    expect(result.rematchCount).toBe(64);
    expect(result.rematchRelaxed).toBe(true);
    // Honest reporting: every pairing here has to be a rematch, but the search
    // could not *prove* that cheaply, so it does not claim minimality.
    expect(result.budgetExhausted).toBe(true);
    expect(result.scoreDifferenceOptimal).toBe(false);
    expect(result.searchSteps).toBeLessThan(MAX_SEARCH_STEPS);
    expect(elapsedMs).toBeLessThan(2000);
  });

  it("does not mutate its input", () => {
    const participants = [
      participant("a", { seed: 1, points: 3 }),
      participant("b", { seed: 2, points: 0 }),
      participant("c", { seed: 3, points: 0 }),
    ];
    const snapshot = JSON.parse(JSON.stringify(participants));

    pairSwissRound({ participants, roundNumber: 2, seed: "s" });

    expect(participants).toEqual(snapshot);
  });
});
