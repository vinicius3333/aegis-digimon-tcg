import type { AnimationQueue, AnimationStepContext } from "../animationQueue";
import type { Side } from "../side";

/** Wait only for peels already queued when this departure was created. */
export async function waitForStackStrips({
  queue,
  context,
  throughKey,
  throughStateVersion,
  permanentId,
  side,
}: {
  queue: AnimationQueue;
  context: AnimationStepContext;
  throughKey: number;
  /** A patch can precede its receipt: include later-created strips belonging to this revision. */
  throughStateVersion?: number;
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
        (throughStateVersion !== undefined && step.origin !== undefined
          ? step.origin.stateVersion <= throughStateVersion
          : Number(step.id.slice("stack-strip-peel-".length)) <= throughKey) &&
        (permanentId === undefined ||
          step.track === "stackStripPeel" ||
          step.track === `stackStripPeel-${permanentId}`) &&
        (side === undefined || step.side === side),
    )
  )
    await context.wait(16);
}
