import type { AnimationStepContext } from "./animationQueue";

/** Local animation age, including time beyond a CSS animation's clamped endpoint. */
export function paintedAnimationAge(animation: Animation): number | undefined {
  const delay = Number(animation.effect?.getTiming().delay ?? 0);
  const timeline = document.timeline?.currentTime;
  const rate = animation.playbackRate ?? 1;
  const age =
    animation.playState !== "paused" && typeof timeline === "number" && typeof animation.startTime === "number"
      ? (timeline - animation.startTime) * rate - delay
      : typeof animation.currentTime === "number"
        ? animation.currentTime - delay
        : undefined;
  return age !== undefined && Number.isFinite(age) ? Math.max(0, age) : undefined;
}

/** A late mount retains its painted time, including accelerated lab waits. */
export async function waitForPaintedAnimation(
  root: () => Element | null | undefined,
  name: string,
  endMs: number,
  context: AnimationStepContext,
) {
  let budget: number | undefined;
  while (context.mode === "live" && !context.cancelled && !context.skipping) {
    const animations = (root()?.getAnimations?.({ subtree: true }) ?? []).filter(
      (entry) => "animationName" in entry && entry.animationName === name,
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
    budget -= Math.max(1, Math.min(16, performance.now() - before));
    if (budget <= 0) return;
  }
}
