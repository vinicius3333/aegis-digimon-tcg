import type { AnimationStepContext } from "../../animationQueue";

/** Reading may begin at 750ms; an owner without a clause waits through 830ms. */
export async function waitForTrashSourceClock(key: number, minimumMs: number, context: AnimationStepContext) {
  // The queue clock starts before React commits. Follow the physical occurrence's
  // painted clock, while cancellation, replay, hidden tabs and skipping still drain.
  while (context.mode === "live" && !context.cancelled && !context.skipping) {
    const card =
      typeof document === "undefined"
        ? null
        : document.querySelector(`.game-pile__effect-card[data-activation-key="${key}"]`);
    const animation = card
      ?.getAnimations?.()
      .find((entry) => "animationName" in entry && entry.animationName === "battle-effect-trash-activation");
    if (
      !animation ||
      animation.playState === "finished" ||
      animation.playState === "idle" ||
      (typeof animation.currentTime === "number" && animation.currentTime >= minimumMs)
    )
      return;
    await context.wait(16);
  }
}
