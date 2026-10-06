import type { AnimationStepContext } from "../../animationQueue";

/** React's commit can trail the queue clock; reading follows the painted hand hold. */
export async function waitForHandSourceClock(key: number, minimumMs: number, context: AnimationStepContext) {
  while (context.mode === "live" && !context.cancelled && !context.skipping) {
    const card =
      typeof document === "undefined"
        ? null
        : document.querySelector(
            `.game-hand-source-focus[data-activation-key="${key}"] .game-hand-source-focus__scale`,
          );
    const animation = card
      ?.getAnimations?.()
      .find((entry) => "animationName" in entry && entry.animationName === "battle-hand-focus-scale");
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
