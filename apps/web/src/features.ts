/* Launch switches for parts of the product that exist in code but are not ready for
   the public. Flip one here to bring the feature back everywhere it is gated. */

/** Ranked queue, ranked stats and ranked match history. Off for the public beta. */
export const RANKED_ENABLED = false;

/**
 * Sequential effect pacing in real matches, with its Effect speed setting. Off: players keep
 * `current` pacing. The effects lab (/dev/effects-lab) uses sequential pacing either way.
 */
export const SEQUENTIAL_PACING_ENABLED = false;
