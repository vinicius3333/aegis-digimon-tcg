import type { AnimationQueue, AnimationStepContext } from "../animationQueue";
import { CueTrack } from "./enums";
import { createPresentationGate, type PresentationGate } from "./presentationGate";

/** The two handoffs owned by an arrival, also retained across server batches. */
export interface ArrivalPresentation {
  revealed: PresentationGate;
  landed: PresentationGate;
}

export function createArrivalPresentation(): ArrivalPresentation {
  return { revealed: createPresentationGate(), landed: createPresentationGate() };
}

/** A queue-owned beat has no wall-clock deadline: playback pause freezes its handoff too. */
export async function waitForPresentation(gate: PresentationGate | undefined, context: AnimationStepContext) {
  while (gate && !gate.open && context.mode === "live" && !context.cancelled && !context.skipping)
    await context.wait(16);
}

/**
 * Acquire the single card reveal after the caller's causal gates have opened. Waiting
 * for those gates on this shared track would block the clause that releases them.
 * The caller retains ownership of cancellation, including a replacing security cue.
 */
export async function runCardReveal({
  queue,
  context,
  id,
  duration,
  origin,
  show,
  clear,
}: {
  queue: AnimationQueue;
  context: AnimationStepContext;
  id: string;
  duration: number;
  origin?: { batchId: string; stateVersion: number; phaseOrder?: number };
  show: () => void;
  clear: () => void;
}) {
  const finished = createPresentationGate();
  if (context.mode !== "live" || context.cancelled || context.skipping) return;
  queue.enqueue({
    id,
    origin,
    track: CueTrack.CardReveal,
    onDiscard: () => finished.release(),
    async run(revealContext) {
      let removeCancellation = () => {};
      try {
        if (revealContext.mode !== "live" || context.cancelled || context.skipping) return;
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
        // One wait shares CSS's full clock. Repeated short waits accumulate browser
        // scheduling delay and can leave the field empty after the art has exited.
        await Promise.race([revealContext.wait(duration), cancelled]);
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
