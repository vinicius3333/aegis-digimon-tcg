import type { AnimationStepContext } from "../../animationQueue";
import { paintedAnimationAge } from "../../paintedAnimationClock";
import { TIMINGS } from "../../timings";

/** Each source finishes its painted fade before the next source or decision is released. */
export async function waitForStackStripClock(board: HTMLElement | null, key: number, context: AnimationStepContext) {
  for (
    let poll = 0;
    poll < Math.ceil(TIMINGS.stackStripPeel / 16) + 2 &&
    context.mode === "live" &&
    !context.cancelled &&
    !context.skipping;
    poll++
  ) {
    const face = board?.querySelector<HTMLElement>(`[data-stack-strip="${key}"] .game-stack-strip-peel__face`);
    const animation = face
      ?.getAnimations?.()
      .find((entry) => "animationName" in entry && entry.animationName === "battle-stack-strip-fade");
    if (!animation) return;
    if ((paintedAnimationAge(animation) ?? 0) >= TIMINGS.stackStripPeel) {
      // Retain the completed fade through a paint before releasing the next source.
      await context.wait(16);
      return;
    }
    await context.wait(16);
  }
}
