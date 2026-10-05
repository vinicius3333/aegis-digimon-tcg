import type { AnimationStepContext } from "../../animationQueue";
import { COMBAT_IMPACT_TOTAL_MS } from "../../timings";
import { paintedAnimationAge } from "../../paintedAnimationClock";

/** The queue can lead React's paint; preserve the actual impact and its final settle. */
export async function waitForCombatImpactClock(permanentIds: readonly string[], context: AnimationStepContext) {
  const ids = new Set(permanentIds);
  const maxPolls = Math.ceil(COMBAT_IMPACT_TOTAL_MS / 16);
  for (let poll = 0; poll < maxPolls && context.mode === "live" && !context.cancelled && !context.skipping; poll++) {
    if (typeof document === "undefined") return;
    const roots = [...document.querySelectorAll<HTMLElement>("[data-combat-impact][data-permanent-id]")].filter(
      (root) => ids.has(root.dataset.permanentId!),
    );
    const animations = roots
      .flatMap((root) => root.getAnimations?.({ subtree: true }) ?? [])
      .filter(
        (entry) =>
          "animationName" in entry &&
          (entry.animationName === "battle-claw" || entry.animationName === "battle-card-impact"),
      );
    const unfinished = animations.some((animation) => {
      const age = paintedAnimationAge(animation) ?? 0;
      return age < COMBAT_IMPACT_TOTAL_MS;
    });
    if (!unfinished) return;
    await context.wait(16);
  }
}
