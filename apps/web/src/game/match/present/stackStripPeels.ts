import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { flushSync } from "react-dom";
import type { Permanent, Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import { TIMINGS } from "../../timings";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { Side } from "../../side";
import { heldDeletionFrom } from "../heldDeletion";
import type { StateSnapshot } from "../../../net/presentedState";
import type { DeleteBurst, HeldStackStrip, MatchCueAnchors } from "../types";

import { burstColorFor } from "../../showcases";
import { waitForStackStripClock } from "./stackStripClock";
import type { StackTopResolutions } from "../stackTopResolutions";

/**
 * The top card a ＜De-Digivolve＞ (or any effect trashing stack tops) stripped, or the
 * digivolution cards an effect trashed, shown as a small outlined black silhouette.
 * Without it the board only swaps the top card or the stack count in the next patch, and a
 * player who looked away never learns the Digimon lost a level or its sources.
 *
 * It waits for the clause that caused it, like every other consequence, and plays only in
 * live mode while the viewer is not fast-forwarding, so a replay or a skip drops it.
 */
export function enqueueStackStripPeels({
  queue,
  snapshots,
  stateVersion,
  viewerSeat,
  setHeldStackStrips,
  fresh,
  anchors,
  deleteBurstKeyRef,
  causingEffectGate,
  setDeleteBursts,
  enqueue,
  topResolutions,
}: {
  queue: AnimationQueue;
  snapshots: readonly StateSnapshot[];
  stateVersion: number;
  viewerSeat: Seat;
  setHeldStackStrips: Dispatch<SetStateAction<ReadonlyMap<number, HeldStackStrip>>>;
  fresh: readonly ServerEvent[];
  anchors: MatchCueAnchors;
  /** Mutated: shares the burst key space, since the peel is drawn on the burst layer. */
  deleteBurstKeyRef: MutableRefObject<number>;
  causingEffectGate: PresentationGate | null;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
  enqueue: (step: AnimationStep) => void;
  topResolutions?: StackTopResolutions;
}) {
  for (const event of fresh) {
    if (event.kind !== "cardsMoved" || event.seat === undefined) continue;
    // Trashed digivolution cards peel one after another off the Digimon that keeps standing.
    // The peel holds the next decision, so a follow-up choice ("Then, return 1 ...") opens
    // only after the player saw which Digimon lost its cards.
    const permanentId = event.strippedStackTops?.permanentId ?? event.trashedSources?.permanentId;
    if (permanentId === undefined) continue;
    const peeledCount = event.instanceIds.length;
    const center = anchors.permanentCenter?.(permanentId);
    if (center === undefined) continue;
    const peels: DeleteBurst[] = [];
    const peeledIds: (string | undefined)[] = [];
    for (let index = 0; index < peeledCount; index += 1) {
      const cardId = event.cardIds?.[index];
      if (cardId === undefined) continue;
      const artId = event.artIds?.[index];
      peeledIds.push(event.instanceIds[index]);
      peels.push({
        key: (deleteBurstKeyRef.current += 1),
        x: center.x,
        y: center.y,
        cardId,
        color: burstColorFor(cardId),
        stackStripDirection: event.seat === viewerSeat ? 1 : -1,
        ...(artId && artId !== cardId ? { artId } : {}),
        stackStrip: true,
      });
    }
    if (peels.length === 0) continue;
    const key = peels[0]!.key;
    const held = heldDeletionFrom({
      snapshots: snapshots.filter((snapshot) => snapshot.stateVersion < stateVersion),
      seat: event.seat,
      permanentId,
      topInstanceId: event.strippedStackTops ? event.instanceIds[0] : undefined,
    });
    setHeldStackStrips((current) => {
      const preceding = [...current.values()].find((strip) => strip.permanent.permanentId === permanentId);
      const origin = preceding ?? held;
      if (!origin) return current;
      return new Map(current).set(key, {
        seat: origin.seat,
        permanent: origin.permanent,
        index: origin.index,
        stateVersion,
        returnedInstanceId: undefined,
        beforeCostDps: event.trashedSources?.digiBurstDpBefore
          ? new Map(event.trashedSources.digiBurstDpBefore.map((figure) => [figure.permanentId, figure.currentDP]))
          : undefined,
      });
    });
    function release() {
      setHeldStackStrips((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    }
    enqueue({
      id: `stack-strip-peel-${peels[0]!.key}`,
      track: "stackStripPeel",
      side: event.seat === viewerSeat ? Side.Viewer : Side.Opponent,
      onDiscard: release,
      async run(context) {
        try {
          if (context.mode !== "live" || context.skipping) return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "stackStripPeel/causingEffect");
          for (const [index, peel] of peels.entries()) {
            if (context.cancelled || context.skipping) return;
            // Read the current host after its cause gate; the small vignette stays upright.
            const host = anchors.permanentFace?.(permanentId);
            const position = host ?? anchors.permanentCenter?.(permanentId) ?? center;
            const width = ((host?.width ?? 72) * 2) / 9;
            const height = ((host?.height ?? 100.8) * 2) / 9;
            peel.face = { x: position.x, y: position.y, width, height, angle: 0 };
            peel.permanentId = permanentId;
            peel.x = position.x - width / 2;
            peel.y = position.y - height / 2;
            let resolved: Extract<ServerEvent, { kind: "stackTopResolved" }> | undefined;
            try {
              setDeleteBursts((bursts) => [...bursts, peel]);
              await context.wait(TIMINGS.stackStripPeel);
              await waitForStackStripClock(anchors.board.current, peel.key, context);
              if (event.strippedStackTops?.sequenceId && topResolutions) {
                const departed = peeledIds[index]!;
                resolved = await topResolutions.take({
                  sequenceId: event.strippedStackTops.sequenceId,
                  strippedInstanceId: departed,
                  permanentId,
                  context,
                });
              }
            } finally {
              setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== peel.key));
              // The next peel can start in the same queue turn. Commit its host's
              // promoted artwork and engine DP together before that peel mounts.
              flushSync(() =>
                setHeldStackStrips((current) => {
                  const strip = current.get(key);
                  if (!strip) return current;
                  const permanent = strip.permanent;
                  const top = event.strippedStackTops ? permanent.stack.at(-1) : undefined;
                  const progressed = {
                    ...permanent,
                    ...(top ? { topCard: top } : {}),
                    ...(resolved && top?.instanceId === resolved.topInstanceId
                      ? { baseDP: resolved.baseDP, currentDP: resolved.currentDP }
                      : {}),
                    stack: top
                      ? permanent.stack.slice(0, -1)
                      : permanent.stack.filter((card) => card.instanceId !== peeledIds[index]),
                  } as Permanent;
                  // Several strips can share one patch. Queued peels must inherit the
                  // active peel's progress rather than restoring the old snapshot again.
                  return new Map(
                    [...current].map(([heldKey, candidate]) => [
                      heldKey,
                      candidate.permanent.permanentId === permanentId
                        ? { ...candidate, permanent: progressed }
                        : candidate,
                    ]),
                  );
                }),
              );
            }
          }
        } finally {
          release();
        }
      },
    });
    // A queued step can be replaced before it runs, so cleanup also follows queue idle.
    void queue.idle().then(release);
  }
}
