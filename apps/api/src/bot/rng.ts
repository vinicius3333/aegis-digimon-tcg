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
  /** State needed to resume the stream on a replacement process. */
  exportState(): number;
}

export function createBotRandom(seed: number): BotRandom {
  return createBotRandomFromState(seed >>> 0);
}

export function createBotRandomFromState(state: number): BotRandom {
  if (!Number.isSafeInteger(state) || state < 0 || state > 0xffff_ffff)
    throw new Error("bot RNG state must be an unsigned 32-bit integer");
  let currentState = state >>> 0;
  return {
    next(): number {
      currentState = (currentState + 0x6d2b79f5) >>> 0;
      let t = currentState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    exportState(): number {
      return currentState;
    },
  };
}
