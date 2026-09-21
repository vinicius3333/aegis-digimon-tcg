/**
 * A tiny seeded pseudo-random generator (mulberry32).
 *
 * The bot must be reproducible: given the same engine seed and the same bot seed,
 * every decision — including the tie-breaks between equally-scored candidate actions
 * and the length of the think delay — has to come out identical, so a benchmark run
 * or a bug report can be replayed exactly. `Math.random()` cannot offer that.
 */
export interface BotRandom {
  /** Next value in [0, 1). */
  next(): number;
}

export function createBotRandom(seed: number): BotRandom {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
