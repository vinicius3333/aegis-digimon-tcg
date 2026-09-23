import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import { TIMINGS } from "../../timings";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import type { DeleteBurst, MatchCueAnchors } from "../types";

/** The peeled card is drawn at this width; its box is centred on the permanent. */
const PEEL_CARD_WIDTH = 72;
const PEEL_CARD_HEIGHT = 100;

/**
 * The top card a ＜De-Digivolve＞ (or any effect trashing stack tops) stripped, lifting off
 * the permanent that keeps standing. Without it the board only swaps the top card in the
 * next patch, and a player who looked away never learns the Digimon lost a level.
 *
 * It waits for the clause that caused it, like every other consequence, and plays only in
 * live mode while the viewer is not fast-forwarding, so a replay or a skip drops it.
 */
export function enqueueStackStripPeels({
  fresh,
  anchors,
  deleteBurstKeyRef,
  causingEffectGate,
  setDeleteBursts,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  anchors: MatchCueAnchors;
  /** Mutated: shares the burst key space, since the peel is drawn on the burst layer. */
  deleteBurstKeyRef: MutableRefObject<number>;
  causingEffectGate: PresentationGate | null;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
  enqueue: (step: AnimationStep) => void;
}) {
  for (const event of fresh) {
    if (event.kind !== "cardsMoved" || event.strippedStackTops === undefined) continue;
    const { permanentId } = event.strippedStackTops;
    const cardId = event.cardIds?.[0];
    const center = anchors.permanentCenter?.(permanentId);
    if (cardId === undefined || center === undefined) continue;
    const artId = event.artIds?.[0];
    const key = (deleteBurstKeyRef.current += 1);
    const peel: DeleteBurst = {
      key,
      x: center.x - PEEL_CARD_WIDTH / 2,
      y: center.y - PEEL_CARD_HEIGHT / 2,
      cardId,
      ...(artId && artId !== cardId ? { artId } : {}),
      stackStrip: true,
    };
    enqueue({
      id: `stack-strip-peel-${key}`,
      track: `stackStripPeel-${permanentId}`,
      async run(context) {
        if (context.mode !== "live" || context.skipping) return;
        await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "stackStripPeel/causingEffect");
        if (context.cancelled) return;
        try {
          setDeleteBursts((bursts) => [...bursts, peel]);
          await context.wait(TIMINGS.stackStripPeel);
        } finally {
          setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== key));
        }
      },
    });
  }
}
