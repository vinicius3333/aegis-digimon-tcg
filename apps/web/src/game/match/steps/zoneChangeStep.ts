import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { CueTrack } from "../enums";
import { withoutId } from "../eventLookup";
import type { PermanentBurst, ZoneShowcase } from "../../showcases";
import { SHOWCASE_TOTAL_MS, TIMINGS } from "../../timings";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import type { ServerEvent } from "@aegis/shared";
import type { FlyPlayedCard, PlayFlightOrigin } from "../flights";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";

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
  track = CueTrack.CenterStage,
  waitFor,
  play,
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
  /**
   * Which track the cue runs on. An arrival that owns the centre of the screen stays on the
   * serial centre-stage track; one that is merely the consequence of a clause takes its own,
   * so waiting for that clause to be read cannot hold the toast itself behind it.
   */
  track?: string;
  /** The clause this arrival is the consequence of; the card arrives once it has been read. */
  waitFor?: PresentationGate;
  play?: { event: Extract<ServerEvent, { kind: "cardPlayed" }>; fly: FlyPlayedCard };
}): AnimationStep {
  const origin = presentationBatchRef.current && {
    ...presentationBatchRef.current,
    phaseOrder: enqueuePhaseOrderRef.current,
  };
  return {
    id: `zone-change-${key}`,
    ...(origin ? { origin } : {}),
    ...(burst ? { arrivingPermanentId: burst.permanentId } : {}),
    track,
    async run(context) {
      // The caller may already be holding the permanent off the board on this step's
      // behalf, so every exit — including the ones that draw nothing — hands it back.
      if (context.mode !== "live") {
        if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        return;
      }
      await waitForGate(waitFor, context, CONSEQUENCE_GATE_MAX_MS, "zoneChange/costClause");
      // A card that changed zones because of a battle waits for the battle to play.
      if (leadInMs > 0) await context.wait(leadInMs);
      if (context.cancelled) {
        if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        return;
      }
      let showcaseOrigin: PlayFlightOrigin | undefined;
      if (showcase) {
        try {
          if (burst) setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
          setZoneShowcase(play ? { ...showcase, departToField: true } : showcase);
          await context.wait(SHOWCASE_TOTAL_MS);
          if (play) {
            const rect = document.querySelector(".battle-showcase__art")?.getBoundingClientRect();
            if (rect?.width) showcaseOrigin = rect;
          }
        } finally {
          // A replacing cue (a security check) cancels the wait, and the board
          // must not be left holding a card up or hiding a permanent.
          setZoneShowcase((current) => (current?.key === showcase.key ? null : current));
          if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        }
        if (context.cancelled) return;
      }
      if (!burst) return;
      if (play) {
        // Keep the destination hidden through travel, then let the landing and On Play
        // happen on the permanent's existing serialized burst track.
        setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
        try {
          await play.fly(play.event, context, showcaseOrigin);
        } finally {
          setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        }
        if (context.cancelled) return;
      }
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
