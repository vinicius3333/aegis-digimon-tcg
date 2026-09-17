import type { Seat, ServerEvent } from "@aegis/shared";
import type { SoundKind } from "../../../design/sound";
import type { AnimationStep } from "../../animationQueue";
import { soundForEvent } from "../../soundEvents";

/**
 * One sound cue per event the batch carries.
 *
 * `turnEnded` is left out: the turn banner plays its own cue, and the event's sound would
 * double it.
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
      enqueue({ id: `sound-${batchId}-${event.kind}`, track: "sound", run: () => playCue(cue) });
  }
}
