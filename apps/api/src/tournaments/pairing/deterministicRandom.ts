// A tiny seeded PRNG so pairing never touches Math.random. Round 1 has no
// standings to sort by, so its order comes from here: same seed string and same
// round always produce the same shuffle, on any machine, forever.

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

export function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export type DeterministicRandom = () => number;

export function createDeterministicRandom(seed: string): DeterministicRandom {
  // xorshift32; state 0 is the single degenerate value, so it is nudged away.
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

export function shuffle<T>(items: readonly T[], random: DeterministicRandom): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index] as T;
    shuffled[index] = shuffled[swapIndex] as T;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}
