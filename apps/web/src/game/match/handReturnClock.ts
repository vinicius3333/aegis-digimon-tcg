import type { AnimationStepContext } from "../animationQueue";
import { paintedAnimationAge } from "../paintedAnimationClock";
import { TIMINGS } from "../timings";

/** The physical approach reaches its last painted frame before the stack is removed. */
export async function waitForHandReturnClock(board: HTMLElement, key: number, context: AnimationStepContext) {
  for (
    let poll = 0;
    poll < Math.ceil(TIMINGS.handReturn / 16) + 2 && context.mode === "live" && !context.cancelled && !context.skipping;
    poll++
  ) {
    const animation = board.querySelector(`[data-hand-return="${key}"]`)?.getAnimations?.()[0];
    if (!animation) return;
    if ((paintedAnimationAge(animation) ?? 0) >= TIMINGS.handReturn) {
      await context.wait(16);
      return;
    }
    await context.wait(16);
  }
}
