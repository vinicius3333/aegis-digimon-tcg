import { describe, expect, it } from "vitest";
import {
  advancementSlot,
  bracketSeedOrder,
  bracketSize,
  bracketSlots,
  derivedBracketSeed,
  firstRoundPairings,
  roundCount,
  seedEntrants,
} from "./bracket.js";

function field(count: number, seed: number | null = null) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    accountId: `a${index}`,
    seed,
  }));
}

describe("bracket size", () => {
  it("rounds the field up to a power of two", () => {
    expect([2, 3, 5, 6, 8, 9].map(bracketSize)).toEqual([2, 4, 8, 8, 8, 16]);
  });

  it("has no bracket below two participants", () => {
    expect(bracketSize(1)).toBe(0);
    expect(roundCount(0)).toBe(0);
  });

  it("runs one round per doubling", () => {
    expect([2, 4, 8, 16].map(roundCount)).toEqual([1, 2, 3, 4]);
    expect(bracketSlots(4)).toEqual([
      { round: 1, position: 0 },
      { round: 1, position: 1 },
      { round: 2, position: 0 },
    ]);
  });
});

describe("seeding", () => {
  it("is reproducible from the seed alone", () => {
    const seed = derivedBracketSeed("tournament-1");
    expect(seedEntrants(field(6), seed)).toEqual(seedEntrants(field(6), seed));
  });

  it("draws a different order under a different seed", () => {
    const order = (seed: string) => seedEntrants(field(8), seed).map((entrant) => entrant.participantId);
    expect(order(derivedBracketSeed("tournament-1"))).not.toEqual(order(derivedBracketSeed("tournament-2")));
  });

  it("numbers every entrant exactly once, in one contiguous run", () => {
    const seeds = seedEntrants(field(5), derivedBracketSeed("t")).map((entrant) => entrant.seed);
    expect(seeds).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps a seed the organizer already assigned, and draws only the rest", () => {
    const entrants = seedEntrants(
      [
        { id: "drawn-a", accountId: null, seed: null },
        { id: "pinned", accountId: null, seed: 1 },
        { id: "drawn-b", accountId: null, seed: null },
      ],
      derivedBracketSeed("t"),
    );
    expect(entrants[0]).toMatchObject({ participantId: "pinned", seed: 1 });
    expect(entrants.map((entrant) => entrant.seed)).toEqual([1, 2, 3]);
  });

  it("ignores registration order", () => {
    const seed = derivedBracketSeed("t");
    const forwards = seedEntrants(field(8), seed).map((entrant) => entrant.participantId);
    const backwards = seedEntrants([...field(8)].reverse(), seed).map((entrant) => entrant.participantId);
    expect(backwards).toEqual(forwards);
  });
});

describe("first round", () => {
  it("pairs the top seed against the bottom seed", () => {
    const entrants = seedEntrants(field(4), derivedBracketSeed("t"));
    const pairings = firstRoundPairings(entrants, 4);
    expect(pairings).toHaveLength(2);
    expect([pairings[0]!.entrant0!.seed, pairings[0]!.entrant1!.seed]).toEqual([1, 4]);
    expect([pairings[1]!.entrant0!.seed, pairings[1]!.entrant1!.seed]).toEqual([2, 3]);
  });

  it("gives the byes to the top seeds when the field is short", () => {
    // Five entrants in an eight-slot bracket: seeds 1, 2 and 3 have no opponent.
    const entrants = seedEntrants(field(5), derivedBracketSeed("t"));
    const pairings = firstRoundPairings(entrants, 8);
    const byeSeeds = pairings
      .filter((pairing) => !pairing.entrant0 || !pairing.entrant1)
      .map((pairing) => (pairing.entrant0 ?? pairing.entrant1)!.seed);
    expect(byeSeeds.sort((a, b) => a - b)).toEqual([1, 2, 3]);
    // Nobody is left out and nobody appears twice.
    const placed = pairings.flatMap((pairing) => [pairing.entrant0, pairing.entrant1]).filter(Boolean);
    expect(new Set(placed.map((entrant) => entrant!.participantId)).size).toBe(5);
  });

  it("has no bye at all when the field fills the bracket", () => {
    const pairings = firstRoundPairings(seedEntrants(field(8), derivedBracketSeed("t")), 8);
    expect(pairings.every((pairing) => pairing.entrant0 && pairing.entrant1)).toBe(true);
  });
});

describe("advancement", () => {
  it("feeds two adjacent positions into one match, even first", () => {
    expect(advancementSlot(1, 0, 8)).toEqual({ round: 2, position: 0, seat: 0 });
    expect(advancementSlot(1, 1, 8)).toEqual({ round: 2, position: 0, seat: 1 });
    expect(advancementSlot(1, 3, 8)).toEqual({ round: 2, position: 1, seat: 1 });
  });

  it("has nowhere to advance from the final", () => {
    expect(advancementSlot(3, 0, 8)).toBeUndefined();
    expect(advancementSlot(1, 0, 2)).toBeUndefined();
  });
});

/**
 * Walks a whole bracket with the higher seed winning every confrontation, and reports the seeds
 * that met in each round.
 *
 * The pairings alone do not prove a bracket is seeded correctly — the naive 1-v-N-by-position
 * layout produces exactly the right FIRST round and then puts seeds 1 and 2 in the semifinal,
 * because adjacent positions feed one match. Only walking the winner paths can catch that, so
 * that is what these tests assert.
 */
function higherSeedWinsPaths(entrantCount: number, size: number): number[][] {
  const entrants = seedEntrants(field(entrantCount), derivedBracketSeed("t")).map((entrant, index) => ({
    ...entrant,
    seed: index + 1,
  }));
  const rounds: number[][] = [];
  // `winners[position]` is the seed occupying that slot of the round being played.
  let winners = new Map<number, number>();
  for (const pairing of firstRoundPairings(entrants, size))
    winners.set(pairing.position, Math.min(pairing.entrant0?.seed ?? Infinity, pairing.entrant1?.seed ?? Infinity));
  rounds.push(
    firstRoundPairings(entrants, size).flatMap((pairing) =>
      pairing.entrant0 && pairing.entrant1 ? [pairing.entrant0.seed, pairing.entrant1.seed] : [],
    ),
  );

  for (let round = 1; round < roundCount(size); round += 1) {
    const next = new Map<number, number>();
    const met: number[] = [];
    for (const [position, seed] of [...winners].sort(([left], [right]) => left - right)) {
      const slot = advancementSlot(round, position, size)!;
      const rival = next.get(slot.position);
      next.set(slot.position, rival === undefined ? seed : Math.min(rival, seed));
      if (rival !== undefined) met.push(rival, seed);
    }
    rounds.push(met);
    winners = next;
  }
  return rounds;
}

describe("seeded placement keeps the top seeds apart", () => {
  it("orders the slots by the standard recursive mirror", () => {
    expect(bracketSeedOrder(2)).toEqual([1, 2]);
    expect(bracketSeedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(bracketSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(bracketSeedOrder(16)).toEqual([1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
  });

  it("gives every slot exactly one seed at every size", () => {
    for (const size of [2, 4, 8, 16, 32]) {
      const order = bracketSeedOrder(size);
      expect(order).toHaveLength(size);
      expect(new Set(order).size).toBe(size);
    }
    // Every first-round pair sums to size + 1: that IS the mirror.
    for (const size of [4, 8, 16, 32]) {
      const order = bracketSeedOrder(size);
      for (let position = 0; position < size / 2; position += 1)
        expect(order[position * 2]! + order[position * 2 + 1]!).toBe(size + 1);
    }
  });

  it("walks a full Top 4 as 1v4 | 2v3 then 1v2", () => {
    expect(higherSeedWinsPaths(4, 4)).toEqual([
      [1, 4, 2, 3],
      [1, 2],
    ]);
  });

  it("walks a full Top 8 as 1v8 | 4v5 | 2v7 | 3v6, then 1v4 | 2v3, then 1v2", () => {
    expect(higherSeedWinsPaths(8, 8)).toEqual([
      [1, 8, 4, 5, 2, 7, 3, 6],
      [1, 4, 2, 3],
      [1, 2],
    ]);
  });

  it("walks a full Top 16 with seeds 1 and 2 meeting only in the final", () => {
    const rounds = higherSeedWinsPaths(16, 16);
    expect(rounds[0]).toEqual([1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
    expect(rounds[1]).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(rounds[2]).toEqual([1, 4, 2, 3]);
    expect(rounds[3]).toEqual([1, 2]);
  });

  it("keeps the top two apart in an under-filled bracket too", () => {
    // Five eligible in a Top 8: seeds 6, 7 and 8 do not exist, so 1, 2 and 3 get the byes.
    const rounds = higherSeedWinsPaths(5, 8);
    expect(rounds[0]).toEqual([4, 5]);
    expect(rounds[1]).toEqual([1, 4, 2, 3]);
    expect(rounds[2]).toEqual([1, 2]);
  });
});
