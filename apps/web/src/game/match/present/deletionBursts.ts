import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import type { DeletionReadyAt, PresentationGate } from "../presentationGate";
import { joinRemovalChain, type RemovalLink } from "../removalChain";
import type { StateSnapshot } from "../../../net/presentedState";
import { deletionAnchorIdsFromEvent, trashedPermanentAnchorIdsFromEvent } from "../../showcases";
import { heldDeletionFrom } from "../heldDeletion";
import { COMBAT_IMPACT_TOTAL_MS, FIELD_CLASH_TOTAL_MS, PLAY_LEAD_IN_BUDGET_MS } from "../../timings";
import { deleteBurstStep } from "../steps/deleteBurstStep";
import type { DeleteBurst, HeldDeletion, MatchCueAnchors } from "../types";

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
 *
 * Until the shatter begins the permanent stays on the board: the batch is presented, and its
 * board rendered, as soon as it is reached, which is before the clause explaining the
 * deletion has been read out.
 *
 * An Option permanent trashed whole from the battle area breaks the same way. Everything one
 * effect takes off the field leaves one card at a time (`removalChain.ts`): the ＜Delay＞ Option
 * paying its cost first, then each Digimon the wipe deletes.
 */
export function enqueueDeletionBursts({
  queue,
  fresh,
  snapshots,
  beaten,
  clashLoserIds,
  playLeadInMs,
  anchors,
  deleteBurstKeyRef,
  deletionReadyAtRef,
  deletionBurstPresentedRef,
  removalChainRef,
  securityBlowRef,
  causingEffectGate,
  setDeleteBursts,
  setHeldDeletions,
  enqueue,
  stateVersion,
  causedByOption,
}: {
  queue: AnimationQueue;
  fresh: readonly ServerEvent[];
  snapshots: readonly StateSnapshot[];
  beaten: ReadonlySet<string>;
  clashLoserIds: ReadonlySet<string>;
  playLeadInMs: number;
  anchors: MatchCueAnchors;
  /** Mutated: incremented per burst so each shatter gets its own key. */
  deleteBurstKeyRef: MutableRefObject<number>;
  deletionReadyAtRef: MutableRefObject<Map<string, DeletionReadyAt>>;
  /** Mutated: every anchor already given a shatter, across batches. */
  deletionBurstPresentedRef: MutableRefObject<Set<string>>;
  /** Mutated: the latest card an effect took off the field, which the next one follows. */
  removalChainRef: MutableRefObject<RemovalLink | null>;
  securityBlowRef: MutableRefObject<{ key: number; landed: boolean; gate: PresentationGate } | null>;
  causingEffectGate: PresentationGate | null;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
  setHeldDeletions: Dispatch<SetStateAction<ReadonlyMap<number, HeldDeletion>>>;
  enqueue: (step: AnimationStep) => void;
  stateVersion: number;
  causedByOption: boolean;
}) {
  function releaseHeldDeletion(key: number) {
    setHeldDeletions((held) => {
      if (!held.has(key)) return held;
      const next = new Map(held);
      next.delete(key);
      return next;
    });
  }
  const deletionBurstAnchors = new Set<string>();
  const deletionMetadata = new Map(
    fresh.flatMap((event) =>
      event.kind === "cardsMoved"
        ? [...(event.deletedPermanents ?? []), ...(event.trashedPermanents ?? [])].map(
            (left) => [left.permanentId, left] as const,
          )
        : [],
    ),
  );

  for (const event of fresh) {
    const trashedOptionIds = trashedPermanentAnchorIdsFromEvent(event);
    for (const anchorId of [...trashedOptionIds, ...deletionAnchorIdsFromEvent(event)]) {
      if (deletionBurstAnchors.has(anchorId) || deletionBurstPresentedRef.current.has(anchorId)) continue;
      deletionBurstAnchors.add(anchorId);
      // A check whose battle has not been drawn yet owns every deletion in this batch:
      // the server moves the loser to the trash before it closes the check, so without
      // this the shatter plays over a battle the viewer is still waiting to see.
      const openBlow = securityBlowRef.current;
      const blowKey = openBlow !== null && !openBlow.landed ? openBlow.key : undefined;
      const delayMs =
        blowKey !== undefined
          ? 0
          : clashLoserIds.has(anchorId)
            ? FIELD_CLASH_TOTAL_MS
            : beaten.has(anchorId)
              ? COMBAT_IMPACT_TOTAL_MS
              : Math.min(playLeadInMs, PLAY_LEAD_IN_BUDGET_MS);
      const deleted = deletionMetadata.get(anchorId);
      const key = (deleteBurstKeyRef.current += 1);
      const trashedOption = trashedOptionIds.includes(anchorId);
      const effectDeletion = blowKey === undefined && !clashLoserIds.has(anchorId) && !beaten.has(anchorId);
      const removal = trashedOption || effectDeletion ? joinRemovalChain(removalChainRef) : undefined;
      const step = deleteBurstStep({
        queue,
        anchors,
        key,
        deletionReadyAtRef,
        setDeleteBursts,
        releaseHeldDeletion: () => releaseHeldDeletion(key),
        anchorId,
        delayMs,
        metadataCardId: deleted?.cardId,
        metadataArtId: deleted?.artId,
        metadataSeat: deleted?.seat,
        metadataInstanceId: deleted?.instanceId,
        effectDeletion,
        blowKey,
        securityBlowRef,
        causingEffectGate,
        stateVersion,
        causedByOption,
        ...(removal ? { removal } : {}),
        ...(trashedOption ? { breaksWithClause: true } : {}),
      });
      if (!step) {
        removal?.link.started.release();
        continue;
      }
      deletionBurstPresentedRef.current.add(anchorId);
      const held = heldDeletionFrom({ snapshots, seat: deleted?.seat, permanentId: anchorId });
      if (held) setHeldDeletions((current) => new Map(current).set(key, held));
      enqueue(step);
      if (removal) void queue.idle().then(() => removal.link.started.release());
      // A step a later `replace` drops never runs, so the card would stand there for the
      // rest of the match. Registered after the enqueue: on an idle queue the promise
      // settles at once and the hold would be given back before it began.
      if (held) void queue.idle().then(() => releaseHeldDeletion(key));
    }
  }
}
