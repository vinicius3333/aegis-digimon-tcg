import type { Dispatch, SetStateAction } from "react";
import type { AnimationStepContext } from "../../animationQueue";
import type { SecurityClashScene } from "../../securityClash";
import { waitForCardShatterClock } from "../../cardShatterClock";
import { TIMINGS } from "../../timings";

/** Keep the disposal mounted through its actual painted CSS clock after React commits. */
export async function exitSecurityCard({
  key,
  context,
  setSecurityClash,
  shatter = false,
}: {
  key: number;
  /** A losing attacker fragments in parallel with the checked card disposal. */
  shatter?: boolean;
  context: AnimationStepContext;
  setSecurityClash: Dispatch<SetStateAction<SecurityClashScene | null>>;
}) {
  setSecurityClash((current) => (current?.key === key ? { ...current, exiting: true } : current));
  await context.wait(TIMINGS.securityCardExit);
  // The queue clock begins before React's commit and CSS's first painted frame.
  // The remaining frames belong to this owner too. A headless queue, reduced motion,
  // replay or an already removed scene has no decorative clock to wait for.
  while (context.mode === "live" && !context.cancelled && !context.skipping) {
    const art =
      typeof document === "undefined"
        ? null
        : document.querySelector(
            `.battle-clash[data-scene-key="${key}"][data-exiting="true"] .battle-clash__card[data-role="revealed"] .battle-clash__art`,
          );
    const animation = art
      ?.getAnimations?.()
      .find((item) => "animationName" in item && item.animationName === "battle-security-exit");
    if (!animation || animation.playState === "finished" || animation.playState === "idle") break;
    await context.wait(16);
  }
  if (shatter) {
    await context.wait(TIMINGS.cardShatter - TIMINGS.securityCardExit);
    await waitForCardShatterClock(key, context);
  }
}
