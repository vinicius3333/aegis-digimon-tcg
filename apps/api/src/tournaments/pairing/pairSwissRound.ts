import type { PairingReason } from "@aegis/shared";
import { createDeterministicRandom, shuffle } from "./deterministicRandom.js";

// Deterministic Swiss pairer. Pure: no clock, no database, no randomness beyond
// the caller's seed string. The same input always produces the same round.
//
// Constraint order (implementation plan, "Pareamento e standings") and exactly
// how much of each this implementation delivers:
//
//   1. group by points -- exact. The participants are put in one total order
//      (points desc, seed asc with null last, id asc) and pairing walks it.
//   2. avoid rematches -- exact whenever `budgetExhausted` is false. The round
//      is searched with iterative deepening on the number of rematches allowed
//      (0, then 1, then 2...), so the first assignment found uses the fewest
//      rematches any assignment can. `rematchRelaxed` reports that the count
//      was above zero; `budgetExhausted` reports that a level was abandoned on
//      its cap, which is the only case where the count may not be minimal.
//   3. distribute pair-down stably -- deterministic, NOT spread across rounds.
//      The same participant may pair down repeatedly; balancing that needs a
//      per-participant pair-down history the input does not carry.
//   4. never repeat a bye while an eligible participant has none -- exact, and
//      subordinate to constraint 2: every participant tied on the fewest byes
//      is tried as the bye before any rematch is accepted, in rank order, so
//      the bye choice can never force an avoidable rematch.
//   5. minimise the score difference -- BEST EFFORT, not guaranteed. Among the
//      assignments that use the minimal number of rematches, the search keeps
//      looking for a lower total score difference until a bounded improvement
//      budget runs out. `scoreDifferenceOptimal` is true only when the whole
//      space was explored, i.e. when the reported difference is provably
//      minimal; otherwise it is the best found.
//   6. break ties by original seed, then by id -- exact, via the total order.

export type PairingParticipant = {
  id: string;
  // Registration seed; participants without one sort after those with one.
  seed: number | null;
  points: number;
  // Every opponent faced so far, one entry per match (a twice-met opponent
  // appears twice). Byes are not opponents and must not be listed here.
  opponentIds: readonly string[];
  byeCount: number;
};

export type SwissPairing = {
  participant0Id: string;
  participant1Id: string;
  reason: PairingReason;
};

export type SwissBye = {
  participantId: string;
  reason: PairingReason;
};

export type SwissPairingResult = {
  roundNumber: number;
  pairings: SwissPairing[];
  bye: SwissBye | null;
  // Audit counters.
  // `rematchRelaxed`: the round contains at least one rematch, i.e. constraint
  //   2 could not be satisfied for every pair.
  // `rematchCount`: how many, and the minimum possible unless `budgetExhausted`.
  // `scoreDifference`: total points gap summed over the pairings.
  // `scoreDifferenceOptimal`: the gap above is provably the minimum for this
  //   rematch count and bye; false means "best found before the budget ran out".
  // `budgetExhausted`: the search stopped early, so nothing here is guaranteed
  //   minimal -- the round is still complete and legal.
  rematchRelaxed: boolean;
  rematchCount: number;
  pairDownCount: number;
  scoreDifference: number;
  scoreDifferenceOptimal: boolean;
  budgetExhausted: boolean;
  searchSteps: number;
};

export type SwissPairingErrorCode = "no_participants" | "duplicate_participant" | "invalid_round_number";

export type SwissPairingError = {
  code: SwissPairingErrorCode;
  message: string;
};

export type SwissPairingOutcome = { ok: true; result: SwissPairingResult } | { ok: false; error: SwissPairingError };

export type SwissPairingInput = {
  participants: readonly PairingParticipant[];
  roundNumber: number;
  // Deterministic seed, typically the tournament id. Only round 1 consumes it:
  // later rounds are fully determined by points, seed and id.
  seed: string;
};

// Budget for finding *an* assignment, counted in candidate attempts and shared
// across every deepening level and bye candidate in the round. A clean descent
// for 128 participants costs 64 attempts, so this leaves room for deep
// backtracking before the search gives up.
export const MAX_SEARCH_STEPS = 200_000;

// Cap on a single (rematch limit, bye) attempt. Without it, one hopeless level
// of the deepening loop can eat the whole round budget: proving that a heavily
// saturated field admits no k-rematch assignment is combinatorial. Capping each
// attempt keeps the loop moving to the level that does have an answer.
export const MAX_ATTEMPT_STEPS = 4_000;

// Extra attempts spent, after an assignment is found, looking for one with a
// smaller total score difference. Bounded separately so a large field does not
// pay the full feasibility budget on cosmetic improvement.
export const MAX_IMPROVEMENT_STEPS = 20_000;

// How many deepening levels may hit their cap before the loop stops climbing.
// A level that caps out means the field is saturated enough that proving a
// given rematch count impossible is expensive; the next level up is no easier,
// so grinding through dozens of them buys nothing. After this many, the search
// takes the unrestricted assignment and says so via `budgetExhausted`.
export const MAX_CAPPED_LEVELS = 2;

export function pairSwissRound(input: SwissPairingInput): SwissPairingOutcome {
  const validation = validate(input);
  if (validation) return { ok: false, error: validation };

  // Sorting first makes the result a function of the roster, not of the order
  // the caller happened to build its array in: the round-1 shuffle is seeded,
  // but a shuffle of a differently ordered array is a different permutation.
  const canonical = [...input.participants].sort(compareForPairing);
  const order =
    input.roundNumber === 1 ? shuffle(canonical, createDeterministicRandom(`${input.seed}:round:1`)) : canonical;

  const hasMet = buildHasMet(order);
  const solution = solve(order, hasMet);

  const pairings = solution.assignment.pairs.map(([left, right]) => ({
    participant0Id: left.id,
    participant1Id: right.id,
    reason: reasonFor(left, right, hasMet(left, right)),
  }));

  return {
    ok: true,
    result: {
      roundNumber: input.roundNumber,
      pairings,
      bye:
        solution.bye === null
          ? null
          : {
              participantId: solution.bye.id,
              reason: solution.bye.byeCount === 0 ? "bye_no_prior_bye" : "bye_repeat",
            },
      rematchRelaxed: solution.assignment.rematches > 0,
      rematchCount: solution.assignment.rematches,
      pairDownCount: pairings.filter((pairing) => pairing.reason === "pair_down").length,
      scoreDifference: solution.assignment.scoreDifference,
      scoreDifferenceOptimal: solution.scoreDifferenceOptimal,
      budgetExhausted: solution.budgetExhausted,
      searchSteps: solution.steps,
    },
  };
}

function validate(input: SwissPairingInput): SwissPairingError | null {
  if (!Number.isInteger(input.roundNumber) || input.roundNumber < 1) {
    return {
      code: "invalid_round_number",
      message: `Round number must be a positive integer, got ${input.roundNumber}.`,
    };
  }
  if (input.participants.length === 0) {
    return { code: "no_participants", message: "Cannot pair a round with no participants." };
  }
  const seen = new Set<string>();
  for (const participant of input.participants) {
    if (seen.has(participant.id)) {
      return {
        code: "duplicate_participant",
        message: `Participant "${participant.id}" appears more than once.`,
      };
    }
    seen.add(participant.id);
  }
  return null;
}

// The total order behind constraints 1 and 6.
function compareForPairing(left: PairingParticipant, right: PairingParticipant): number {
  if (left.points !== right.points) return right.points - left.points;
  if (left.seed !== right.seed) {
    if (left.seed === null) return 1;
    if (right.seed === null) return -1;
    return left.seed - right.seed;
  }
  return left.id < right.id ? -1 : 1;
}

function buildHasMet(
  order: readonly PairingParticipant[],
): (left: PairingParticipant, right: PairingParticipant) => boolean {
  const opponents = new Map<string, Set<string>>();
  for (const participant of order) {
    opponents.set(participant.id, new Set(participant.opponentIds));
  }
  return (left, right) => opponents.get(left.id)?.has(right.id) ?? false;
}

// Constraint 4: only participants tied on the fewest byes are eligible, so a
// second bye is impossible while anyone still has none. They are tried
// lowest-ranked first, the conventional Swiss choice.
function byeCandidates(order: readonly PairingParticipant[]): PairingParticipant[] {
  if (order.length % 2 === 0) return [];
  const fewest = Math.min(...order.map((participant) => participant.byeCount));
  return [...order].reverse().filter((participant) => participant.byeCount === fewest);
}

function reasonFor(left: PairingParticipant, right: PairingParticipant, isRematch: boolean): PairingReason {
  // A rematch is the most exceptional thing about a pairing, so it wins the
  // label even when the pair also crossed score groups; `pairDownCount` still
  // counts the crossing separately for audit.
  if (isRematch) return "rematch_unavoidable";
  return left.points === right.points ? "same_score" : "pair_down";
}

type Assignment = {
  pairs: [PairingParticipant, PairingParticipant][];
  rematches: number;
  scoreDifference: number;
};

type Solution = {
  assignment: Assignment;
  bye: PairingParticipant | null;
  scoreDifferenceOptimal: boolean;
  budgetExhausted: boolean;
  steps: number;
};

// Iterative deepening on the allowed rematch count. Level k is tried for every
// eligible bye in rank order before level k + 1 is considered, which is what
// keeps constraint 2 (avoid rematches) above constraint 4 (who gets the bye).
// The first level that yields an assignment therefore uses the fewest rematches
// any legal round can.
//
// The one exception is a level that hit a cap instead of finishing: it might
// have held an assignment the search never reached, so the level above it is
// not provably minimal. That is exactly what `budgetExhausted` reports -- when
// it is false, the rematch count IS the minimum.
function solve(
  order: readonly PairingParticipant[],
  hasMet: (left: PairingParticipant, right: PairingParticipant) => boolean,
): Solution {
  const byeOptions: (PairingParticipant | null)[] = order.length % 2 === 0 ? [null] : byeCandidates(order);
  const fields = new Map<PairingParticipant | null, readonly PairingParticipant[]>(
    byeOptions.map((bye) => [bye, bye === null ? order : order.filter((entry) => entry.id !== bye.id)]),
  );
  const maxRematches = Math.floor(order.length / 2);
  let steps = 0;
  let cappedLevels = 0;

  for (let rematchLimit = 0; rematchLimit <= maxRematches; rematchLimit += 1) {
    let levelCapped = false;

    for (const bye of byeOptions) {
      const field = fields.get(bye) as readonly PairingParticipant[];
      const attemptBudget = Math.min(MAX_ATTEMPT_STEPS, MAX_SEARCH_STEPS - steps);
      const attempt = searchAssignment(field, hasMet, rematchLimit, attemptBudget);
      steps += attempt.steps;

      if (attempt.best) {
        return {
          assignment: attempt.best,
          bye,
          scoreDifferenceOptimal: attempt.exhaustedSpace && cappedLevels === 0,
          budgetExhausted: cappedLevels > 0,
          steps,
        };
      }
      // The attempt stopped on its cap rather than proving this level empty.
      if (!attempt.exhaustedSpace) levelCapped = true;
      if (steps >= MAX_SEARCH_STEPS) break;
    }

    if (levelCapped) cappedLevels += 1;
    if (cappedLevels >= MAX_CAPPED_LEVELS || steps >= MAX_SEARCH_STEPS) break;
  }

  // Every level that could be proven empty was, and the rest cost too much to
  // decide. Take the assignment with rematches unrestricted -- its first
  // descent always completes -- and flag that no minimality claim survives.
  const bye = byeOptions[0] ?? null;
  const field = fields.get(bye) ?? order;
  const unrestricted = searchAssignment(field, hasMet, maxRematches, Math.max(0, MAX_SEARCH_STEPS - steps));
  steps += unrestricted.steps;
  if (unrestricted.best) {
    return {
      assignment: unrestricted.best,
      bye,
      scoreDifferenceOptimal: false,
      budgetExhausted: true,
      steps,
    };
  }

  return { ...fallback(field, hasMet), bye, steps };
}

// Last resort when the budget runs out before any assignment is found: pair the
// field in order. Always complete and legal, never claimed to be optimal.
function fallback(
  field: readonly PairingParticipant[],
  hasMet: (left: PairingParticipant, right: PairingParticipant) => boolean,
): Omit<Solution, "bye" | "steps"> {
  const pairs: [PairingParticipant, PairingParticipant][] = [];
  let rematches = 0;
  let scoreDifference = 0;
  for (let index = 0; index + 1 < field.length; index += 2) {
    const left = field[index] as PairingParticipant;
    const right = field[index + 1] as PairingParticipant;
    pairs.push([left, right]);
    if (hasMet(left, right)) rematches += 1;
    scoreDifference += Math.abs(left.points - right.points);
  }
  return {
    assignment: { pairs, rematches, scoreDifference },
    scoreDifferenceOptimal: false,
    budgetExhausted: true,
  };
}

type SearchAttempt = {
  best: Assignment | null;
  // The whole tree was explored, so `best` is the minimal-score-difference
  // assignment for this rematch limit rather than merely the best found.
  exhaustedSpace: boolean;
  steps: number;
};

// Depth-first assignment of the field under a hard cap on rematches, minimising
// the total score difference. The first unpaired participant is tried against
// the nearest unpaired candidates first (fresh opponents before rematches), so
// the first complete assignment found is the nearest-neighbour one; the search
// then keeps going, pruning any branch that has already spent as much score
// difference as the best assignment so far, until the improvement budget runs
// out. Every attempt costs one step, so the search always terminates.
function searchAssignment(
  field: readonly PairingParticipant[],
  hasMet: (left: PairingParticipant, right: PairingParticipant) => boolean,
  rematchLimit: number,
  feasibilityBudget: number,
): SearchAttempt {
  const paired = new Array<boolean>(field.length).fill(false);
  const current: [PairingParticipant, PairingParticipant][] = [];
  let best: Assignment | null = null;
  let steps = 0;
  let outOfBudget = false;

  const spend = (): boolean => {
    const limit = best === null ? feasibilityBudget : feasibilityBudget + MAX_IMPROVEMENT_STEPS;
    if (steps >= limit) {
      outOfBudget = true;
      return false;
    }
    steps += 1;
    return true;
  };

  const visit = (rematches: number, scoreDifference: number): void => {
    if (best !== null && scoreDifference >= best.scoreDifference) return;

    let leftIndex = 0;
    while (leftIndex < field.length && paired[leftIndex]) leftIndex += 1;
    if (leftIndex >= field.length) {
      best = { pairs: [...current], rematches, scoreDifference };
      return;
    }

    const left = field[leftIndex] as PairingParticipant;
    // Two passes instead of two candidate arrays: fresh opponents in the first,
    // rematches in the second. Nearest first inside each pass, so the first
    // complete assignment is the nearest-neighbour one. Allocating arrays here
    // dominated the cost -- this loop runs up to MAX_SEARCH_STEPS times.
    const rematchesAllowed = rematches < rematchLimit;
    for (let pass = 0; pass < 2; pass += 1) {
      if (pass === 1 && !rematchesAllowed) break;
      const wantRematch = pass === 1;

      for (let rightIndex = leftIndex + 1; rightIndex < field.length; rightIndex += 1) {
        if (paired[rightIndex]) continue;
        const right = field[rightIndex] as PairingParticipant;
        const isRematch = hasMet(left, right);
        if (isRematch !== wantRematch) continue;

        if (!spend()) return;

        paired[leftIndex] = true;
        paired[rightIndex] = true;
        current.push([left, right]);

        visit(rematches + (isRematch ? 1 : 0), scoreDifference + Math.abs(left.points - right.points));

        current.pop();
        paired[leftIndex] = false;
        paired[rightIndex] = false;
        if (outOfBudget) return;
      }
    }
  };

  visit(0, 0);
  return { best, exhaustedSpace: !outOfBudget, steps };
}
