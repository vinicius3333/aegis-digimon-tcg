import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { CueTrack } from "../enums";
import { withoutId } from "../eventLookup";
import type { PermanentBurst, ZoneShowcase } from "../../showcases";
import { CARD_BURST_PEAK_MS, SHOWCASE_TOTAL_MS, TIMINGS } from "../../timings";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { runCardReveal, type ArrivalPresentation } from "../cardReveal";
import { runBreedingTransfer } from "../../breedingTransfer";
import { waitForPaintedAnimation } from "../../paintedAnimationClock";

/** Reveal the public card, then light its destination. Every exit returns held cards. */
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
  combatCompletionGate,
  presentation,
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
  /** Consequences wait on independent tracks so they cannot hold their own clause behind them. */
  track?: string;
  waitFor?: PresentationGate;
  combatCompletionGate?: PresentationGate;
  presentation?: ArrivalPresentation;
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
    onDiscard() {
      presentation?.revealed.release();
      presentation?.landed.release();
      if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
    },
    async run(context) {
      let landingQueued = false;
      try {
        if (context.mode !== "live") return;
        await waitForGate(waitFor, context, CONSEQUENCE_GATE_MAX_MS, "zoneChange/costClause");
        if (leadInMs > 0) await context.wait(leadInMs);
        await waitForGate(combatCompletionGate, context, CONSEQUENCE_GATE_MAX_MS, "zoneChange/paintedImpact");
        if (context.cancelled) return;
        if (showcase) {
          if (burst) setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
          await runCardReveal({
            queue,
            context,
            id: `card-reveal-${key}`,
            origin,
            duration: SHOWCASE_TOTAL_MS,
            show: () => setZoneShowcase(showcase),
            clear: () => setZoneShowcase((current) => (current?.key === showcase.key ? null : current)),
          });
        }
        presentation?.revealed.release();
        if (context.cancelled || !burst) return;
        if (burst.moveFromBreeding) {
          setPermanentBursts((bursts) => new Map(bursts).set(burst.permanentId, burst));
          await runBreedingTransfer(burst.permanentId, queue, context, () => {
            setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
          });
          presentation?.landed.release();
          return;
        }
        // The card appears where it belongs; no synthetic centre-to-field travel.
        setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
        landingQueued = true;
        queue.enqueue({
          id: `burst-${burst.key}`,
          origin,
          track: `burst-${burst.permanentId}`,
          holdsBoard: false,
          onDiscard: () => presentation?.landed.release(),
          async run(burstContext) {
            let lightOwnsCleanup = false;
            const cleanup = () =>
              setPermanentBursts((bursts) => {
                if (bursts.get(burst.permanentId)?.key !== burst.key) return bursts;
                const next = new Map(bursts);
                next.delete(burst.permanentId);
                return next;
              });
            try {
              if (burstContext.mode !== "live") return;
              setPermanentBursts((bursts) => new Map(bursts).set(burst.permanentId, burst));
              await burstContext.wait(CARD_BURST_PEAK_MS);
              await waitForPaintedAnimation(
                () =>
                  typeof document === "undefined"
                    ? null
                    : document.querySelector(`.battle-burst[data-cue-key="${burst.key}"]`),
                "battle-particle-clock",
                CARD_BURST_PEAK_MS,
                burstContext,
              );
              presentation?.landed.release();
              if (burstContext.mode === "live" && !burstContext.cancelled && !burstContext.skipping) {
                queue.enqueue({
                  id: `arrival-light-${burst.key}`,
                  origin,
                  track: `arrivalLight-${burst.key}`,
                  holdsBoard: false,
                  blocksDecision: false,
                  onDiscard: cleanup,
                  async run(lightContext) {
                    try {
                      if (lightContext.mode !== "live") return;
                      await lightContext.wait(TIMINGS.cardBurst - CARD_BURST_PEAK_MS);
                      await waitForPaintedAnimation(
                        () =>
                          typeof document === "undefined"
                            ? null
                            : document.querySelector(`.battle-burst[data-cue-key="${burst.key}"]`),
                        "battle-particle-clock",
                        TIMINGS.cardBurst,
                        lightContext,
                      );
                    } finally {
                      cleanup();
                    }
                  },
                });
                lightOwnsCleanup = true;
              }
            } finally {
              presentation?.landed.release();
              if (!lightOwnsCleanup) cleanup();
            }
          },
        });
      } finally {
        if (burst?.moveFromBreeding) {
          setPermanentBursts((bursts) => {
            if (bursts.get(burst.permanentId)?.key !== burst.key) return bursts;
            const next = new Map(bursts);
            next.delete(burst.permanentId);
            return next;
          });
        }
        presentation?.revealed.release();
        if (!landingQueued) presentation?.landed.release();
        if (burst) setPendingPermanentIds((held) => withoutId(held, burst.permanentId));
      }
    },
  };
}
