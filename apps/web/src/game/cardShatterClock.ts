import type { AnimationStepContext } from "./animationQueue";
import { paintedAnimationAge } from "./paintedAnimationClock";
import { TIMINGS } from "./timings";

/** Native CSS clocks keep their time even when a lab speeds up queue waits. */
async function waitForClashClock(key: number, context: AnimationStepContext, animationName: string, endMs: number) {
  let budget: number | undefined;
  while (context.mode === "live" && !context.cancelled && !context.skipping) {
    const root =
      typeof document === "undefined" ? null : document.querySelector(`.battle-clash[data-scene-key="${key}"]`);
    const animations = (root?.getAnimations?.({ subtree: true }) ?? []).filter(
      (entry) => "animationName" in entry && entry.animationName === animationName,
    );
    if (
      !animations.length ||
      animations.every(
        (entry) =>
          entry.playState === "idle" ||
          (paintedAnimationAge(entry) ?? (entry.playState === "finished" ? endMs : 0)) >= endMs,
      )
    )
      return;
    budget ??=
      Math.max(
        ...animations.map(
          (entry) => Number(entry.effect?.getTiming().delay ?? 0) + endMs - Number(entry.currentTime ?? 0),
        ),
        endMs,
      ) + 64;
    const before = performance.now();
    await context.wait(16);
    // A paused queue can spend minutes in this wait. Count only its polling
    // interval; accelerated waits consume their actual elapsed milliseconds.
    budget -= Math.max(1, Math.min(16, performance.now() - before));
    if (budget <= 0) return;
  }
}

/** A late React commit still owns its full printed fragment animation. */
export function waitForCardShatterClock(key: number, context: AnimationStepContext) {
  return waitForClashClock(key, context, "battle-card-shatter", TIMINGS.cardShatter);
}

/** The 250ms strike and100ms settle finish before disposal, including lab playback. */
export function waitForSecurityBattleClock(key: number, context: AnimationStepContext) {
  return waitForClashClock(key, context, "battle-card-impact", TIMINGS.clashOutcome);
}
