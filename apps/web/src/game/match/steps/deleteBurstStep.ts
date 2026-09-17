import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat } from "@aegis/shared";
import { DELETE_BURST_SIZE } from "../constants";
import type { DeleteBurst, MatchCueAnchors } from "../types";
import { burstColorFor } from "../../showcases";
import { TIMINGS } from "../../timings";
import type { AnimationStep } from "../../animationQueue";

/**
 * The burst left where a deleted permanent stood. The board has already dropped the
 * permanent by the time the deletion is narrated, so the position comes from the last
 * measurement the caller kept, by permanent id or by the id of the card that sat on top;
 * with no measurement there is nowhere to draw it.
 */
export function deleteBurstStep({
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
}: {
  anchors: MatchCueAnchors;
  deleteBurstKeyRef: MutableRefObject<number>;
  deletionReadyAtRef: MutableRefObject<Map<string, { readyAt: number; instanceId?: string }>>;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
  anchorId: string;
  delayMs?: number;
  metadataCardId?: string;
  metadataArtId?: string;
  metadataSeat?: Seat;
  metadataInstanceId?: string;
  effectDeletion?: boolean;
}): AnimationStep | null {
  const center = anchors.permanentCenter?.(anchorId);
  if (!center) return null;
  const key = (deleteBurstKeyRef.current += 1);
  // The reference client shatters the card's own art rather than swapping it for
  // a generic puff, so the burst carries whichever card was standing there.
  const cardId = metadataCardId ?? anchors.permanentCardId?.(anchorId);
  if (cardId && metadataSeat !== undefined) {
    const now = Date.now();
    deletionReadyAtRef.current.set(`${metadataSeat}:${cardId}`, {
      readyAt: now + delayMs + Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter),
      instanceId: metadataInstanceId,
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
      if (context.mode !== "live") return;
      // A permanent beaten in battle takes the blow before it breaks.
      if (delayMs > 0) await context.wait(delayMs);
      if (context.cancelled) return;
      try {
        setDeleteBursts((bursts) => [...bursts, burst]);
        await context.wait(Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter));
      } finally {
        setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== key));
      }
    },
  };
}
