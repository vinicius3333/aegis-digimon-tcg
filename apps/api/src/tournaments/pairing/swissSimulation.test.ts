import { describe, expect, it } from "vitest";
import type { LedgerEntry, TournamentRules } from "@aegis/shared";
import { swissRoundCount } from "@aegis/shared";
import { computeStandingsReport } from "../standings/index.js";
import { createDeterministicRandom } from "./deterministicRandom.js";
import { type PairingParticipant, pairSwissRound, type SwissPairingResult } from "./index.js";

// Property tests over whole simulated tournaments. `fast-check` is not a
// workspace dependency and this slice does not add one, so the generator is a
// seeded xorshift loop: every case is reproducible from its seed string, and a
// failure prints the seed that produced it.

const scoring: TournamentRules["standings"] = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  byePoints: 3,
  tiebreakers: ["points", "match_win_rate", "opponent_match_win_rate"],
};

type SimulatedTournament = {
  ledger: LedgerEntry[];
  rounds: SwissPairingResult[];
  participantIds: string[];
};

function simulate(participantCount: number, seed: string): SimulatedTournament {
  const random = createDeterministicRandom(`outcomes:${seed}`);
  const participantIds = Array.from({ length: participantCount }, (_, index) => `p${index}`);
  const state = new Map<string, PairingParticipant>(
    participantIds.map((id, index) => [id, { id, seed: index + 1, points: 0, opponentIds: [], byeCount: 0 }]),
  );

  const ledger: LedgerEntry[] = [];
  const rounds: SwissPairingResult[] = [];

  for (let roundNumber = 1; roundNumber <= swissRoundCount(participantCount); roundNumber += 1) {
    const outcome = pairSwissRound({
      participants: [...state.values()],
      roundNumber,
      seed,
    });
    if (!outcome.ok) {
      throw new Error(`Round ${roundNumber} of ${participantCount} (seed ${seed}) failed: ${outcome.error.code}`);
    }
    const round = outcome.result;
    rounds.push(round);

    if (round.bye) {
      const recipient = state.get(round.bye.participantId) as PairingParticipant;
      state.set(recipient.id, {
        ...recipient,
        points: recipient.points + scoring.byePoints,
        byeCount: recipient.byeCount + 1,
      });
      ledger.push({
        participantId: recipient.id,
        opponentId: null,
        opponentKind: null,
        roundNumber,
        outcome: "bye",
      });
    }

    for (const pairing of round.pairings) {
      const left = state.get(pairing.participant0Id) as PairingParticipant;
      const right = state.get(pairing.participant1Id) as PairingParticipant;
      const roll = random();
      const [leftOutcome, rightOutcome]: [LedgerEntry["outcome"], LedgerEntry["outcome"]] =
        roll < 0.45
          ? ["win", "loss"]
          : roll < 0.9
            ? ["loss", "win"]
            : roll < 0.95
              ? ["draw", "draw"]
              : ["double_loss", "double_loss"];

      const pointsFor = (result: LedgerEntry["outcome"]): number =>
        result === "win" ? scoring.winPoints : result === "draw" ? scoring.drawPoints : 0;

      state.set(left.id, {
        ...left,
        points: left.points + pointsFor(leftOutcome),
        opponentIds: [...left.opponentIds, right.id],
      });
      state.set(right.id, {
        ...right,
        points: right.points + pointsFor(rightOutcome),
        opponentIds: [...right.opponentIds, left.id],
      });
      ledger.push(
        {
          participantId: left.id,
          opponentId: right.id,
          opponentKind: "human",
          roundNumber,
          outcome: leftOutcome,
        },
        {
          participantId: right.id,
          opponentId: left.id,
          opponentKind: "human",
          roundNumber,
          outcome: rightOutcome,
        },
      );
    }
  }

  return { ledger, rounds, participantIds };
}

const participantCounts = [4, 5, 6, 7, 8, 9, 13, 16, 17, 31, 32, 33, 64, 65, 100, 127, 128];
const seeds = ["alpha", "bravo", "charlie", "delta", "echo"];

describe("Swiss pairing properties", () => {
  for (const participantCount of participantCounts) {
    it(`holds for ${participantCount} participants across every round and seed`, () => {
      // Violations are collected and asserted once at the end: a failure then
      // prints every broken invariant with the seed and round that broke it,
      // instead of stopping at the first one.
      const violations: string[] = [];

      for (const seed of seeds) {
        const { rounds, participantIds } = simulate(participantCount, seed);
        const byesSoFar = new Map<string, number>(participantIds.map((id) => [id, 0]));
        const metSoFar = new Map<string, Set<string>>(participantIds.map((id) => [id, new Set<string>()]));

        for (const round of rounds) {
          const note = `${participantCount}p seed ${seed} round ${round.roundNumber}`;
          const appearances = new Map<string, number>();

          for (const pairing of round.pairings) {
            if (pairing.participant0Id === pairing.participant1Id) {
              violations.push(`${note}: ${pairing.participant0Id} paired with itself`);
            }
            for (const id of [pairing.participant0Id, pairing.participant1Id]) {
              appearances.set(id, (appearances.get(id) ?? 0) + 1);
            }
          }
          if (round.bye) {
            appearances.set(round.bye.participantId, (appearances.get(round.bye.participantId) ?? 0) + 1);
          }

          // Everyone appears exactly once per round.
          for (const [id, count] of appearances) {
            if (count !== 1) violations.push(`${note}: ${id} appears ${count} times`);
          }
          if (appearances.size !== participantCount) {
            violations.push(`${note}: ${appearances.size} of ${participantCount} participants seated`);
          }

          // Exactly one bye if and only if the field is odd.
          if ((round.bye !== null) !== (participantCount % 2 === 1)) {
            violations.push(`${note}: bye presence ${round.bye !== null} for an odd field`);
          }

          if (round.bye) {
            const priorByes = byesSoFar.get(round.bye.participantId) ?? 0;
            const everyoneHasOne = participantIds.every((id) => (byesSoFar.get(id) ?? 0) > 0);
            if (priorByes > 0 && !everyoneHasOne) {
              violations.push(`${note}: repeated bye while someone had none`);
            }
            const expectedReason = priorByes > 0 ? "bye_repeat" : "bye_no_prior_bye";
            if (round.bye.reason !== expectedReason) {
              violations.push(`${note}: bye reason ${round.bye.reason}, expected ${expectedReason}`);
            }
            byesSoFar.set(round.bye.participantId, priorByes + 1);
          }

          // A rematch is only ever labelled `rematch_unavoidable`, and only
          // appears in a round the search had to relax.
          for (const pairing of round.pairings) {
            const met = metSoFar.get(pairing.participant0Id)?.has(pairing.participant1Id) ?? false;
            if (met && pairing.reason !== "rematch_unavoidable") {
              violations.push(`${note}: rematch labelled ${pairing.reason}`);
            }
            if (met && !round.rematchRelaxed) {
              violations.push(`${note}: rematch without relaxation`);
            }
          }

          for (const pairing of round.pairings) {
            metSoFar.get(pairing.participant0Id)?.add(pairing.participant1Id);
            metSoFar.get(pairing.participant1Id)?.add(pairing.participant0Id);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  }

  it("is reproducible: the same simulation run twice is identical", () => {
    for (const participantCount of [7, 16, 33, 128]) {
      const first = simulate(participantCount, "reproducible");
      const second = simulate(participantCount, "reproducible");
      expect(second.rounds).toEqual(first.rounds);
      expect(second.ledger).toEqual(first.ledger);
    }
  });

  it("still returns a complete round when every opponent has been met", () => {
    // Round 6 of an 8-player field where everyone has met everyone: no
    // rematch-free round exists, so the deepening loop must climb to the level
    // that does have an answer and return all four pairs as rematches.
    const ids = Array.from({ length: 8 }, (_unused, index) => `p${index}`);
    const participants = ids.map((id, index) => ({
      id,
      seed: index + 1,
      points: 3 * (index % 3),
      opponentIds: ids.filter((other) => other !== id),
      byeCount: 0,
    }));

    const outcome = pairSwissRound({ participants, roundNumber: 6, seed: "saturated" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.pairings).toHaveLength(4);
    expect(outcome.result.rematchCount).toBe(4);
    expect(outcome.result.rematchRelaxed).toBe(true);
  });
});

describe("standings over simulated tournaments", () => {
  it("stays consistent with the ledger for every field size", () => {
    const violations: string[] = [];

    for (const participantCount of participantCounts) {
      const { ledger, participantIds } = simulate(participantCount, "standings");
      const report = computeStandingsReport({
        ledger,
        standings: scoring,
        participants: participantIds.map((id, index) => ({ id, seed: index + 1 })),
      });
      const label = `${participantCount}p`;

      if (report.rows.length !== participantCount) {
        violations.push(`${label}: ${report.rows.length} rows`);
      }
      report.rows.forEach((row, index) => {
        if (row.rank !== index + 1) violations.push(`${label}: rank ${row.rank} at index ${index}`);
      });

      const totalPoints = report.rows.reduce((sum, row) => sum + row.points, 0);
      const expectedPoints = ledger.reduce((sum, entry) => {
        if (entry.outcome === "win" || entry.outcome === "bye") return sum + scoring.winPoints;
        if (entry.outcome === "draw") return sum + scoring.drawPoints;
        return sum;
      }, 0);
      if (totalPoints !== expectedPoints) {
        violations.push(`${label}: ${totalPoints} points, ledger says ${expectedPoints}`);
      }

      for (const row of report.rows) {
        const { participantId } = row;
        // The own rate is raw, so it spans the full range; only the value fed
        // to opponents carries the floor.
        if (row.matchWinRate < 0 || row.matchWinRate > 1) {
          violations.push(`${label}: ${participantId} win rate ${row.matchWinRate}`);
        }
        if (row.opponentMatchWinRate < 0.33 || row.opponentMatchWinRate > 1) {
          violations.push(`${label}: ${participantId} OMW% ${row.opponentMatchWinRate}`);
        }
        if (row.flooredMatchWinRate < 0.33) {
          violations.push(`${label}: ${participantId} floored rate ${row.flooredMatchWinRate}`);
        }
        if (row.unratedOpponentMatches !== 0) {
          violations.push(`${label}: ${participantId} met ${row.unratedOpponentMatches} ghosts`);
        }
        if (row.wins + row.losses + row.draws !== row.ratedRounds) {
          violations.push(`${label}: ${participantId} record does not sum to rated rounds`);
        }
        if (row.byes > 1) violations.push(`${label}: ${participantId} took ${row.byes} byes`);
      }

      // Points never rise as rank falls.
      for (let index = 1; index < report.rows.length; index += 1) {
        const previous = report.rows[index - 1]?.points ?? 0;
        const current = report.rows[index]?.points ?? 0;
        if (previous < current) violations.push(`${label}: points rise at rank ${index + 1}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
