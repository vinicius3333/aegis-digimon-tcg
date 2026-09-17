import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { CueTrack } from "../enums";
import { withoutId } from "../eventLookup";
import type { PermanentBurst, ZoneShowcase } from "../../showcases";
import { SHOWCASE_TOTAL_MS, TIMINGS } from "../../timings";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";

/**
 * One zone change, in the order the reference client plays it: the card is held
 * centre-screen while its destination stays hidden, then the permanent reveals
 * on its colour-keyed burst.
 *
 * The whole sequence is pure motion — the side panel and the effect notice
 * carry the information — so reduced motion, a hidden tab and replayed history
 * all drop it rather than flashing it past.
 */
export function zoneChangeStep({
  queue,
  presentationBatchRef,
  enqueuePhaseOrderRef,
  setPendingPermanentIds,
  setZoneShowcase,
  setPermanentBursts,
  key,
  showcase,
  burst,
  leadInMs = 0,
}: {
  queue: AnimationQueue;
  presentationBatchRef: MutableRefObject<{ batchId: string; stateVersion: number } | undefined>;
  enqueuePhaseOrderRef: MutableRefObject<number | undefined>;
  setPendingPermanentIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setZoneShowcase: Dispatch<SetStateAction<ZoneShowcase | null>>;
  setPermanentBursts: Dispatch<SetStateAction<ReadonlyMap<string, PermanentBurst>>>;
  key: number;
  showcase: ZoneShowcase | null;
  burst: PermanentBurst | null;
  leadInMs?: number;
}): AnimationStep {
  const origin = presentationBatchRef.current && {
    ...presentationBatchRef.current,
    phaseOrder: enqueuePhaseOrderRef.current,
  };
  return {
    id: `zone-change-${key}`,
    track: CueTrack.CenterStage,
    async run(context) {
      // The caller may already be holding the permanent off the board on this step's
      // behalf, so every exit — including the ones that draw nothing — hands it back.
      if (context.mode !== "live") {
        if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        return;
      }
      // A card that changed zones because of a battle waits for the battle to play.
      if (leadInMs > 0) await context.wait(leadInMs);
      if (context.cancelled) {
        if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        return;
      }
      if (showcase) {
        try {
          if (burst) setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
          setZoneShowcase(showcase);
          await context.wait(SHOWCASE_TOTAL_MS);
        } finally {
          // A replacing cue (a security check) cancels the wait, and the board
          // must not be left holding a card up or hiding a permanent.
          setZoneShowcase((current) => (current?.key === showcase.key ? null : current));
          if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        }
        if (context.cancelled) return;
      }
      if (!burst) return;
      // A Security play belonging to the viewer has no centre-screen showcase, but it
      // may still have been held until the source card completed its right-hand move.
      // Hand the field back at this landing beat, together with its burst.
      if (!showcase) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
      // The permanent's track also carries its effect prelude. Serialize later
      // arrivals so an automatic evolution cannot cancel the earlier toast.
      queue.enqueue({
        id: `burst-${burst.key}`,
        origin,
        track: `burst-${burst.permanentId}`,
        async run(burstContext) {
          if (burstContext.mode !== "live") return;
          setPermanentBursts((bursts) => new Map(bursts).set(burst.permanentId, burst));
          await burstContext.wait(TIMINGS.cardBurst);
          setPermanentBursts((bursts) => {
            if (bursts.get(burst.permanentId)?.key !== burst.key) return bursts;
            const next = new Map(bursts);
            next.delete(burst.permanentId);
            return next;
          });
        },
      });
    },
  };
}
