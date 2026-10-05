import type { AnimationStepContext } from "../../animationQueue";
import type { DeckRiffle } from "../../deckChrome";
import { paintedAnimationAge } from "../../paintedAnimationClock";
import { TIMINGS } from "../../timings";

/** Retain the three strokes through React's paint delay and the completed CSS frame. */
export async function waitForDeckRiffleClock(riffle: DeckRiffle, context: AnimationStepContext) {
  if (typeof document === "undefined") return;
  const board = document.querySelector<HTMLElement>(".aegis-arena[data-viewer-seat]");
  if (!board) return;
  const side = Number(board.dataset.viewerSeat) === riffle.seat ? "you" : "opp";
  const pile = riffle.pile === "deck" ? "deck" : "eggs";
  for (
    let poll = 0;
    poll < Math.ceil(TIMINGS.deckRiffle / 16) && context.mode === "live" && !context.cancelled && !context.skipping;
    poll++
  ) {
    const roots = board.querySelectorAll<HTMLElement>(
      `.game-utility-slot--${side}-${pile} .game-pile--riffling[data-deck-riffle-key="${riffle.key}"]`,
    );
    const animations = [...roots]
      .flatMap((root) => root.getAnimations?.({ subtree: true }) ?? [])
      .filter((animation) => "animationName" in animation && animation.animationName === "battle-deck-riffle");
    if (!animations.length) return;
    const unfinished = animations.some((animation) => {
      const duration = Number(animation.effect?.getComputedTiming().duration);
      return (paintedAnimationAge(animation) ?? 0) < duration;
    });
    await context.wait(16);
    if (!unfinished) return;
  }
}
