import { createHash } from "node:crypto";

/**
 * The shape of a single-elimination bracket, as pure arithmetic over a seeded field.
 *
 * Nothing here touches a database, a clock or a random number generator. Given the same
 * participants and the same bracket seed it produces the same bracket for ever, which is what makes
 * a published pairing safe to re-derive after a restart instead of being redrawn.
 */

/** A participant placed in the draw. `seed` is 1-based: seed 1 is the top of the bracket. */
export type BracketEntrant = {
  participantId: string;
  accountId: string | null;
  seed: number;
};

/** One first-round pairing. A missing opponent is a bye for the entrant that is present. */
export type BracketPairing = {
  position: number;
  entrant0: BracketEntrant | undefined;
  entrant1: BracketEntrant | undefined;
};

/**
 * The seed a tournament's draw is derived from, when the organizer supplied none.
 *
 * Derived from the tournament id rather than drawn at random so that it is reproducible from data
 * that already exists: the same event always produces the same draw, a re-run of bracket creation
 * cannot produce a different one, and no extra state has to survive a crash between "decide the
 * seed" and "write the bracket". It is still persisted onto `tournaments.bracket_seed`, so an
 * organizer-supplied seed can replace it and the draw stays explainable from the row alone.
 */
export function derivedBracketSeed(tournamentId: string): string {
  return createHash("sha256").update(`aegis-bracket:${tournamentId}`).digest("hex");
}

/** The bracket's slot count: the next power of two at or above the field. */
export function bracketSize(participants: number): number {
  if (participants < 2) return 0;
  return 2 ** Math.ceil(Math.log2(participants));
}

/** How many rounds a bracket of this size runs. */
export function roundCount(size: number): number {
  return size < 2 ? 0 : Math.log2(size);
}

/**
 * Orders the field into seeds 1..n.
 *
 * A participant who already carries a `seed` keeps it — that is an organizer's or an earlier
 * phase's decision, and redrawing it here would silently discard it. Everybody else is ordered by a
 * keyed hash of their participant id, which is a deterministic shuffle: stable for one seed,
 * unrelated to registration order (so arriving first buys nothing), and reproducible by anyone
 * holding the seed.
 *
 * Pre-seeded entrants are placed first, in their own order, so a partially seeded field still
 * produces one contiguous 1..n run.
 *
 * A Top Cut does NOT arrive through this function. Its seeds come from the frozen final Swiss
 * standings, are written onto `tournament_participants.top_cut_seed` in the transaction that
 * freezes them, and are read straight back by `EliminationStore.publishSeededBracket` — which never
 * calls this. (A separate column from `seed`, deliberately: `seed` is the registration seed the
 * standings use as their final tiebreak, so overwriting it would reorder the very standings the cut
 * was derived from.) Nothing in this module reads standings itself, and nothing should — a bracket
 * that re-derived a seeding from mutable standings would draw a different cut every time it was
 * re-read.
 */
export function seedEntrants(
  participants: readonly { id: string; accountId: string | null; seed: number | null }[],
  bracketSeed: string,
): BracketEntrant[] {
  const preSeeded = participants
    .filter((participant) => participant.seed !== null)
    .sort((a, b) => a.seed! - b.seed! || a.id.localeCompare(b.id));
  const drawn = participants
    .filter((participant) => participant.seed === null)
    .map((participant) => ({ participant, key: shuffleKey(bracketSeed, participant.id) }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.participant.id.localeCompare(b.participant.id))
    .map((entry) => entry.participant);
  return [...preSeeded, ...drawn].map((participant, index) => ({
    participantId: participant.id,
    accountId: participant.accountId,
    seed: index + 1,
  }));
}

function shuffleKey(bracketSeed: string, participantId: string): string {
  return createHash("sha256").update(`${bracketSeed}:${participantId}`).digest("hex");
}

/**
 * The seed occupying each slot of the draw, in slot order.
 *
 * This is the standard single-elimination placement, and getting it right is the whole point of
 * seeding. Pairing the first round 1-v-N, 2-v-(N-1) in POSITION order is not enough: adjacent
 * positions feed the same second-round match (see {@link advancementSlot}), so a naive layout puts
 * the winners of 1-v-8 and 2-v-7 together and seeds 1 and 2 meet in the semifinal. The reward for
 * finishing first would be to play the second-place finisher one round early.
 *
 * The correct order is built by recursive mirroring: start from `[1]`, and at each doubling replace
 * every seed `s` with the pair `[s, 2n+1-s]`, where `n` is the size before doubling.
 *
 *     [1] → [1,2] → [1,4,2,3] → [1,8,4,5,2,7,3,6]
 *
 * Read two at a time, that last row is the Top 8 first round: 1-v-8, 4-v-5, 2-v-7, 3-v-6. Its
 * winners, by seed, are 1, 4, 2, 3 — so the semifinals are 1-v-4 and 2-v-3, and 1 and 2 can only
 * meet in the final. The property holds at every size because each doubling keeps the two halves
 * mirror images of each other, which is what confines the top two seeds to opposite halves.
 */
export function bracketSeedOrder(size: number): number[] {
  if (size < 2) return size === 1 ? [1] : [];
  let order = [1];
  while (order.length < size) {
    const half = order.length;
    order = order.flatMap((seed) => [seed, 2 * half + 1 - seed]);
  }
  return order;
}

/**
 * Pairs the first round by {@link bracketSeedOrder}: slot `2p` against slot `2p+1`.
 *
 * With a field smaller than the bracket the tail seeds simply do not exist, so the byes land on the
 * top seeds — which is the point of the ordering, not an accident of it. Seed 1 is only ever paired
 * against a real opponent once every stronger-placed slot is filled.
 */
export function firstRoundPairings(entrants: readonly BracketEntrant[], size: number): BracketPairing[] {
  const order = bracketSeedOrder(size);
  const bySeed = new Map(entrants.map((entrant) => [entrant.seed, entrant]));
  const pairings: BracketPairing[] = [];
  for (let position = 0; position < size / 2; position += 1) {
    pairings.push({
      position,
      entrant0: bySeed.get(order[position * 2]!),
      entrant1: bySeed.get(order[position * 2 + 1]!),
    });
  }
  return pairings;
}

/**
 * Where a match's winner goes next, or `undefined` when this match IS the final.
 *
 * `seat` is which side of the next match the winner occupies. Two adjacent positions feed one
 * match, the even one taking seat 0, so a bracket drawn once is walked the same way every time.
 */
export function advancementSlot(
  round: number,
  position: number,
  size: number,
): { round: number; position: number; seat: 0 | 1 } | undefined {
  if (round >= roundCount(size)) return undefined;
  return { round: round + 1, position: Math.floor(position / 2), seat: position % 2 === 0 ? 0 : 1 };
}

/** Every (round, position) slot of a bracket of this size, in play order. */
export function bracketSlots(size: number): { round: number; position: number }[] {
  const slots: { round: number; position: number }[] = [];
  for (let round = 1; round <= roundCount(size); round += 1)
    for (let position = 0; position < size / 2 ** round; position += 1) slots.push({ round, position });
  return slots;
}
