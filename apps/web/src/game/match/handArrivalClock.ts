import type { AnimationStepContext } from "../animationQueue";
import { paintedAnimationAge } from "../paintedAnimationClock";
import { Side } from "../side";

/** Retain serial hand additions through image decode and the actual entry clock. */
export async function waitForHandArrivalClock({
  side,
  instanceId,
  context,
}: {
  side: Side;
  instanceId?: string;
  context: AnimationStepContext;
}) {
  for (let poll = 0; poll < 188 && context.mode === "live" && !context.cancelled && !context.skipping; poll++) {
    if (typeof document === "undefined") return;
    const root =
      side === Side.Viewer
        ? [...document.querySelectorAll<HTMLElement>("[data-hand-instance-id]")].find(
            (card) => card.dataset.handInstanceId === instanceId,
          )
        : [...document.querySelectorAll<HTMLElement>("[data-opponent-hand-slot]")].at(-1);
    if (!root) return;
    if (!root.classList.contains("game-hand-card--arrival-pending")) {
      const animation = root
        .getAnimations?.()
        .find(
          (candidate) =>
            "animationName" in candidate &&
            (candidate.animationName === "battle-hand-draw" ||
              candidate.animationName === "battle-opponent-hand-entry"),
        );
      if (
        !animation ||
        (paintedAnimationAge(animation) ?? 0) >= Number(animation.effect?.getComputedTiming().duration ?? 80)
      )
        return;
    }
    await context.wait(16);
  }
}
