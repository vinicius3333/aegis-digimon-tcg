import type { Dispatch, SetStateAction } from "react";
import type { DeckRiffle } from "../../deckChrome";
import { TIMINGS } from "../../timings";
import type { AnimationStep } from "../../animationQueue";
import { waitForDeckRiffleClock } from "../present/deckRiffleClock";

/**
 * One riffle of a deck pile. Motion with nothing to read — the panel narrating
 * the cards going back already says what happened — so it is skipped outright
 * unless the queue is live.
 */
export function deckRiffleStep({
  setDeckRiffles,
  riffle,
}: {
  setDeckRiffles: Dispatch<SetStateAction<ReadonlyMap<string, number>>>;
  riffle: DeckRiffle;
}): AnimationStep {
  const id = `${riffle.seat}:${riffle.pile}`;
  return {
    id: `deck-riffle-${riffle.key}`,
    track: `deckRiffle-${id}`,
    replace: true,
    async run(context) {
      if (context.mode !== "live") return;
      try {
        setDeckRiffles((piles) => new Map(piles).set(id, riffle.key));
        await context.wait(TIMINGS.deckRiffle);
        await waitForDeckRiffleClock(riffle, context);
      } finally {
        setDeckRiffles((piles) => {
          if (piles.get(id) !== riffle.key) return piles;
          const next = new Map(piles);
          next.delete(id);
          return next;
        });
      }
    },
  };
}
