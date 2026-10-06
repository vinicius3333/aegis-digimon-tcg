import type { AnimationQueue, AnimationStep, AnimationStepContext } from "../animationQueue";
import { paintedAnimationAge } from "../paintedAnimationClock";
import { createPresentationGate } from "./presentationGate";
import { waitForPresentation } from "./cardReveal";
import { CueTrack } from "./enums";
import type { Side } from "../side";

/** Acquire the single temporary card only after the outer owner has passed its gates. */
export async function runDrawPresentation({
  queue,
  context,
  key,
  origin,
  side,
  timing,
  show,
  handOver,
  clear,
  waitForClock = waitForDrawPresentationClock,
}: {
  queue: AnimationQueue;
  context: AnimationStepContext;
  key: number;
  origin?: AnimationStep["origin"];
  side: Side;
  timing: { handoff: number; total: number };
  show: () => void;
  handOver: () => void;
  clear: () => void;
  waitForClock?: (key: number, beat: number, context: AnimationStepContext) => Promise<void>;
}) {
  const finished = createPresentationGate();
  queue.enqueue({
    id: `draw-presentation-${key}`,
    origin,
    side,
    track: CueTrack.DrawPresentation,
    onDiscard: () => {
      clear();
      finished.release();
    },
    async run(local) {
      let removeCancellation = () => {};
      try {
        if (context.cancelled || context.skipping || local.mode !== "live") return;
        const cancelled = new Promise<void>((resolve) => {
          const signal = context.signal;
          if (signal?.aborted) resolve();
          else if (signal) {
            const onAbort = () => resolve();
            signal.addEventListener("abort", onAbort, { once: true });
            removeCancellation = () => signal.removeEventListener("abort", onAbort);
          }
        });
        show();
        const choreography = (async () => {
          await local.wait(timing.handoff);
          await waitForClock(key, timing.handoff, local);
          if (context.cancelled || local.cancelled) return;
          handOver();
          await local.wait(timing.total - timing.handoff);
          await waitForClock(key, timing.total, local);
        })();
        await Promise.race([choreography, cancelled]);
      } finally {
        removeCancellation();
        clear();
        finished.release();
      }
    },
  });
  try {
    await waitForPresentation(finished, context);
  } finally {
    clear();
  }
}

/** After the queue wait, retain a late React paint or image decode until its local beat. */
export async function waitForDrawPresentationClock(key: number, beat: number, context: AnimationStepContext) {
  for (let poll = 0; poll < 188 && context.mode === "live" && !context.cancelled && !context.skipping; poll++) {
    if (typeof document === "undefined") return;
    const root = document.querySelector<HTMLElement>(`[data-draw-presentation-key="${key}"]`);
    if (!root) return;
    if (root.dataset.drawReady !== "false") {
      const animation = root
        .querySelector(".game-draw-presentation__face")
        ?.getAnimations?.()
        .find(
          (candidate) =>
            "animationName" in candidate &&
            (candidate.animationName === "battle-draw-presentation" ||
              candidate.animationName === "battle-draw-presentation-viewer"),
        );
      if (!animation || (paintedAnimationAge(animation) ?? 0) >= beat) return;
    }
    await context.wait(16);
  }
}
