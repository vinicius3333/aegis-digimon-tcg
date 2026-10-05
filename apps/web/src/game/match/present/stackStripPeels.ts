import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Permanent, Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import { TIMINGS } from "../../timings";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { Side } from "../../side";
import { heldDeletionFrom } from "../heldDeletion";
import type { StateSnapshot } from "../../../net/presentedState";
import type { DeleteBurst, HeldStackStrip, MatchCueAnchors } from "../types";

/** The peeled card is drawn at this width; its box is centred on the permanent. */
const PEEL_CARD_WIDTH = 72;
const PEEL_CARD_HEIGHT = 100;

/**
 * The top card a ＜De-Digivolve＞ (or any effect trashing stack tops) stripped, or the
 * digivolution cards an effect trashed, lifting off the permanent that keeps standing.
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
}) {
  for (const event of fresh) {
    if (event.kind !== "cardsMoved") continue;
    // Trashed digivolution cards peel one after another off the Digimon that keeps standing.
    // The peel holds the next decision, so a follow-up choice ("Then, return 1 ...") opens
    // only after the player saw which Digimon lost its cards.
    const permanentId = event.strippedStackTops?.permanentId ?? event.trashedSources?.permanentId;
    if (permanentId === undefined) continue;
    const peeledCount = event.strippedStackTops ? 1 : event.instanceIds.length;
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
        x: center.x - PEEL_CARD_WIDTH / 2,
        y: center.y - PEEL_CARD_HEIGHT / 2,
        cardId,
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
    });
    if (held) {
      setHeldStackStrips((current) => {
        const preceding = [...current.values()].find((strip) => strip.permanent.permanentId === permanentId);
        return new Map(current).set(key, {
          seat: held.seat,
          permanent: preceding?.permanent ?? held.permanent,
          index: held.index,
          stateVersion,
          returnedInstanceId: undefined,
        });
      });
    }
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
      track: `stackStripPeel-${permanentId}`,
      side: event.seat === viewerSeat ? Side.Viewer : Side.Opponent,
      async run(context) {
        try {
          if (context.mode !== "live" || context.skipping) return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "stackStripPeel/causingEffect");
          for (const [index, peel] of peels.entries()) {
            if (context.cancelled || context.skipping) return;
            try {
              setDeleteBursts((bursts) => [...bursts, peel]);
              await context.wait(TIMINGS.stackStripPeel);
            } finally {
              setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== peel.key));
              setHeldStackStrips((current) => {
                const strip = current.get(key);
                if (!strip) return current;
                const permanent = strip.permanent;
                const top = event.strippedStackTops ? permanent.stack.at(-1) : undefined;
                const progressed = {
                  ...permanent,
                  ...(top ? { topCard: top } : {}),
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
              });
            }
          }
        } finally {
          release();
        }
      },
    });
    // A queued step can be replaced before it runs, so cleanup also follows queue idle.
    if (held) void queue.idle().then(release);
  }
}
