import type { Dispatch, SetStateAction } from "react";
import { withoutId } from "../eventLookup";
import type { DeckRiffle } from "../../deckChrome";
import { TIMINGS } from "../../timings";
import type { AnimationStep } from "../../animationQueue";

/**
 * One riffle of a deck pile. Motion with nothing to read — the panel narrating
 * the cards going back already says what happened — so it is skipped outright
 * unless the queue is live.
 */
export function deckRiffleStep({
  setDeckRiffles,
  riffle,
}: {
  setDeckRiffles: Dispatch<SetStateAction<ReadonlySet<string>>>;
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
        setDeckRiffles((piles) => new Set(piles).add(id));
        await context.wait(TIMINGS.deckRiffle);
      } finally {
        setDeckRiffles((piles) => withoutId(piles, id));
      }
    },
  };
}
