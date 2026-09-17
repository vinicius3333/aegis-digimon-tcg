import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat } from "@aegis/shared";
import { DELETE_BURST_SIZE } from "../constants";
import type { DeleteBurst, MatchCueAnchors } from "../types";
import { burstColorFor } from "../../showcases";
import { TIMINGS } from "../../timings";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import {
  CONSEQUENCE_GATE_MAX_MS,
  createPresentationGate,
  waitForGate,
  type DeletionReadyAt,
  type PresentationGate,
} from "../presentationGate";

/**
 * The burst left where a deleted permanent stood. The board has already dropped the
 * permanent by the time the deletion is narrated, so the position comes from the last
 * measurement the caller kept, by permanent id or by the id of the card that sat on top;
 * with no measurement there is nowhere to draw it.
 */
export function deleteBurstStep({
  queue,
  anchors,
  deleteBurstKeyRef,
  deletionReadyAtRef,
  setDeleteBursts,
  anchorId,
  delayMs = 0,
  metadataCardId,
  metadataArtId,
  metadataSeat,
  metadataInstanceId,
  effectDeletion = false,
  blowKey,
  securityBlowRef,
  causingEffectGate,
}: {
  queue: AnimationQueue;
  anchors: MatchCueAnchors;
  deleteBurstKeyRef: MutableRefObject<number>;
  deletionReadyAtRef: MutableRefObject<Map<string, DeletionReadyAt>>;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
  anchorId: string;
  delayMs?: number;
  metadataCardId?: string;
  metadataArtId?: string;
  metadataSeat?: Seat;
  metadataInstanceId?: string;
  effectDeletion?: boolean;
  /** The security battle this deletion belongs to, if any; its blow gates the shatter. */
  blowKey?: number;
  securityBlowRef: MutableRefObject<{ key: number; landed: boolean; gate: PresentationGate } | null>;
  /** The clause that caused this deletion, which is read out before the card breaks. */
  causingEffectGate: PresentationGate | null;
}): AnimationStep | null {
  const center = anchors.permanentCenter?.(anchorId);
  if (!center) return null;
  const key = (deleteBurstKeyRef.current += 1);
  // The reference client shatters the card's own art rather than swapping it for
  // a generic puff, so the burst carries whichever card was standing there.
  const cardId = metadataCardId ?? anchors.permanentCardId?.(anchorId);
  const shattered = createPresentationGate();
  void queue.idle().then(() => shattered.release());
  if (cardId && metadataSeat !== undefined) {
    const now = Date.now();
    deletionReadyAtRef.current.set(`${metadataSeat}:${cardId}`, {
      readyAt: now + delayMs + Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter),
      instanceId: metadataInstanceId,
      shattered,
    });
  }
  const burst: DeleteBurst = {
    key,
    x: center.x - DELETE_BURST_SIZE / 2,
    y: center.y - DELETE_BURST_SIZE / 2,
    ...(effectDeletion ? { effectDeletion: true } : {}),
    ...(cardId ? { cardId, color: burstColorFor(cardId) } : {}),
    ...(metadataArtId ? { artId: metadataArtId } : {}),
  };
  return {
    id: `delete-burst-${key}`,
    // Several permanents can be deleted by one resolution, so each burst runs on its
    // own track instead of queueing behind the others.
    track: `deleteBurst-${key}`,
    async run(context) {
      if (context.mode !== "live") return shattered.release();
      // A permanent beaten in battle takes the blow before it breaks.
      await Promise.all([
        waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS),
        delayMs > 0 ? context.wait(delayMs) : Promise.resolve(),
      ]);
      if (context.cancelled) return shattered.release();
      // A security battle's blow has no duration to wait out: its scene runs as long as
      // the check takes. Wait on its gate instead, under the dock's ceiling, so a close
      // that never comes cannot hold the shatter for good. This runs on the burst's own
      // track, so nothing on centre stage is waiting behind it.
      if (blowKey !== undefined) {
        const blow = securityBlowRef.current;
        if (blow !== null && blow.key === blowKey) await waitForGate(blow.gate, context, TIMINGS.securityDockMax);
      }
      if (context.cancelled) return shattered.release();
      try {
        setDeleteBursts((bursts) => [...bursts, burst]);
        await context.wait(Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter));
      } finally {
        shattered.release();
        setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== key));
      }
    },
  };
}
