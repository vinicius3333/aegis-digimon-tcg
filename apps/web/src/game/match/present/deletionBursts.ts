import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import { deletionAnchorIdsFromEvent } from "../../showcases";
import { COMBAT_IMPACT_TOTAL_MS, FIELD_CLASH_TOTAL_MS, PLAY_LEAD_IN_BUDGET_MS } from "../../timings";
import { deleteBurstStep } from "../steps/deleteBurstStep";
import type { DeleteBurst, MatchCueAnchors } from "../types";

/**
 * The shatter left where each permanent this batch deleted stood.
 *
 * One permanent gets one shatter: a combat resolution and the deletion movement can share a
 * batch, the former describing why the permanent left and the latter carrying its public
 * identity.
 *
 * When it plays depends on what did the deleting. A deletion a battle dealt waits for the
 * blow; one an announced play dealt waits for the beats that explain it — the card
 * centre-stage under its call-out, then the clause that did the deleting — capped so the
 * shatter never drifts far from the board dropping the permanent.
 */
export function enqueueDeletionBursts({
  fresh,
  beaten,
  clashLoserIds,
  playLeadInMs,
  anchors,
  deleteBurstKeyRef,
  deletionReadyAtRef,
  deletionBurstPresentedRef,
  setDeleteBursts,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  beaten: ReadonlySet<string>;
  clashLoserIds: ReadonlySet<string>;
  playLeadInMs: number;
  anchors: MatchCueAnchors;
  /** Mutated: incremented per burst so each shatter gets its own key. */
  deleteBurstKeyRef: MutableRefObject<number>;
  deletionReadyAtRef: MutableRefObject<Map<string, { readyAt: number; instanceId?: string }>>;
  /** Mutated: every anchor already given a shatter, across batches. */
  deletionBurstPresentedRef: MutableRefObject<Set<string>>;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
  enqueue: (step: AnimationStep) => void;
}) {
  const deletionBurstAnchors = new Set<string>();
  const deletionMetadata = new Map(
    fresh.flatMap((event) =>
      event.kind === "cardsMoved" && event.deletedPermanents
        ? event.deletedPermanents.map((deleted) => [deleted.permanentId, deleted] as const)
        : [],
    ),
  );
  for (const event of fresh) {
    for (const anchorId of deletionAnchorIdsFromEvent(event)) {
      if (deletionBurstAnchors.has(anchorId) || deletionBurstPresentedRef.current.has(anchorId)) continue;
      deletionBurstAnchors.add(anchorId);
      const delayMs = clashLoserIds.has(anchorId)
        ? FIELD_CLASH_TOTAL_MS
        : beaten.has(anchorId)
          ? COMBAT_IMPACT_TOTAL_MS
          : Math.min(playLeadInMs, PLAY_LEAD_IN_BUDGET_MS);
      const deleted = deletionMetadata.get(anchorId);
      const step = deleteBurstStep({
        anchors,
        deleteBurstKeyRef,
        deletionReadyAtRef,
        setDeleteBursts,
        anchorId,
        delayMs,
        metadataCardId: deleted?.cardId,
        metadataArtId: deleted?.artId,
        metadataSeat: deleted?.seat,
        metadataInstanceId: deleted?.instanceId,
        effectDeletion: !clashLoserIds.has(anchorId) && !beaten.has(anchorId),
      });
      if (step) {
        deletionBurstPresentedRef.current.add(anchorId);
        enqueue(step);
      }
    }
  }
}
