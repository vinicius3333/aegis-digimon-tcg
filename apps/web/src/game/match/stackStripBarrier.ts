import type { AnimationQueue, AnimationStepContext } from "../animationQueue";
import type { Side } from "../side";

/** Wait only for peels already queued when this departure was created. */
export async function waitForStackStrips({
  queue,
  context,
  throughKey,
  permanentId,
  side,
}: {
  queue: AnimationQueue;
  context: AnimationStepContext;
  throughKey: number;
  permanentId?: string;
  side?: Side;
}): Promise<void> {
  if (context.mode !== "live") return;
  while (
    !context.cancelled &&
    !context.skipping &&
    queue.hasPendingStep(
      (step) =>
        step.id.startsWith("stack-strip-peel-") &&
        Number(step.id.slice("stack-strip-peel-".length)) <= throughKey &&
        (permanentId === undefined || step.track === `stackStripPeel-${permanentId}`) &&
        (side === undefined || step.side === side),
    )
  )
    await context.wait(16);
}
