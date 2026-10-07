import type { Seat, ServerEvent } from "@aegis/shared";
import type { SoundKind } from "../../../design/sound";
import type { AnimationStep } from "../../animationQueue";
import { soundForEvent } from "../../soundEvents";

/** No painted presentation owns these, so the queue sounds them in order even in live mode. */
const QUEUE_VOICED_EVENTS: ReadonlySet<ServerEvent["kind"]> = new Set([
  "gameOver",
  "blocked",
  "barrierResolved",
  "evadeResolved",
]);

/**
 * Visible presentation state owns gameplay audio in live mode.
 *
 * Turn handover retains its banner cue. Reduced motion collapses decorative
 * presentations, so their queued receipts provide static-board feedback instead.
 */
export function enqueueBatchSounds({
  fresh,
  viewerSeat,
  batchId,
  enqueue,
  playCue,
}: {
  fresh: readonly ServerEvent[];
  viewerSeat: Seat;
  batchId: string;
  enqueue: (step: AnimationStep) => void;
  playCue: (kind: SoundKind) => void;
}) {
  for (const event of fresh) {
    const cue = soundForEvent(event, viewerSeat);
    if (cue && event.kind !== "turnEnded")
      enqueue({
        id: `sound-${batchId}-${event.kind}`,
        track: "sound",
        run(context) {
          if (context.cancelled || context.mode === "replay" || context.skipping) return;
          if (context.mode === "live" && !QUEUE_VOICED_EVENTS.has(event.kind)) return;
          playCue(cue);
        },
      });
  }
}
