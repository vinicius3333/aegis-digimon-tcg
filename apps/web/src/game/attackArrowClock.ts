import { ARROW_SWEEP_TOTAL_MS } from "./timings";
import type { AnimationStepContext } from "./animationQueue";
import { paintedAnimationAge } from "./paintedAnimationClock";

/** The actual painted declaration clock, captured before a field resolution replaces it. */
export interface AttackArrowClock {
  key: string;
  elapsedMs: number;
  remainingMs: number;
  observedAtMs: number;
  /** Local-clock advance per wall-clock millisecond; zero while paused. */
  playbackRate?: number;
}

/** An unpainted same-batch declaration may still be finishing its suspension. */
export async function waitForAttackArrowClock(
  key: string | undefined,
  permanentId: string,
  context: AnimationStepContext,
) {
  if (!key || typeof document === "undefined") return;
  for (
    let poll = 0;
    poll < Math.ceil(ARROW_SWEEP_TOTAL_MS / 16) && context.mode === "live" && !context.cancelled && !context.skipping;
    poll++
  ) {
    const clock = readAttackArrowClock({ board: document.body, key, permanentId });
    if (!clock || clock.remainingMs <= 0) return;
    await context.wait(Math.min(16, clock.remainingMs));
  }
}

export function readAttackArrowClock({
  board,
  key,
  permanentId,
}: {
  board: HTMLElement | null;
  key: string;
  permanentId: string;
}): AttackArrowClock | undefined {
  if (!board) return;
  const svg = [...board.querySelectorAll<SVGElement>(".game-attack-arrow--tracking")].find(
    (element) => element.dataset.attackKey === key && element.dataset.attackSource === permanentId,
  );
  const animation = svg
    ?.querySelector(".game-attack-arrow__reveal")
    ?.getAnimations?.()
    .find((entry) => "animationName" in entry && entry.animationName === "battle-arrow-extend");
  if (!animation) return;
  // Finished CSS currentTime clamps at 310 ms. Timeline age also measures the
  // following 70 ms settle and restores a carried clock after a DOM remount.
  const age = paintedAnimationAge(animation);
  if (age === undefined) return;
  const elapsedMs = Math.min(ARROW_SWEEP_TOTAL_MS, Math.max(0, age));
  return {
    key,
    elapsedMs,
    remainingMs: ARROW_SWEEP_TOTAL_MS - elapsedMs,
    observedAtMs: performance.now(),
    playbackRate: animation.playState === "paused" ? 0 : (animation.playbackRate ?? 1),
  };
}
