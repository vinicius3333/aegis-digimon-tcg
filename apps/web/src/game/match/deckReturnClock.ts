import type { AnimationStepContext } from "../animationQueue";
import { paintedAnimationAge } from "../paintedAnimationClock";
import { TIMINGS } from "../timings";

/** A later removal waits for the printed return face to finish on screen. */
export async function waitForDeckReturnClock(board: HTMLElement, key: number, context: AnimationStepContext) {
  for (
    let poll = 0;
    poll < Math.ceil(TIMINGS.deckReturn / 16) + 2 && context.mode === "live" && !context.cancelled && !context.skipping;
    poll++
  ) {
    const root = board.querySelector(`[data-deck-return="${key}"]`);
    const face = root?.querySelector<HTMLElement>("[data-deck-return-face], .game-deck-return__fallback");
    const animation = face
      ?.getAnimations?.()
      .find((clock) => "animationName" in clock && clock.animationName === "battle-deck-return-fade");
    if (!animation) return;
    if ((paintedAnimationAge(animation) ?? 0) >= TIMINGS.deckReturn) {
      await context.wait(16);
      return;
    }
    await context.wait(16);
  }
}
