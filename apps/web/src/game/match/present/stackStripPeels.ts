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
 * The top card a ＜De-Digivolve＞ (or any effect trashing stack tops) stripped, or the
 * digivolution cards an effect trashed, lifting off the permanent that keeps standing.
 * Without it the board only swaps the top card or the stack count in the next patch, and a
 * player who looked away never learns the Digimon lost a level or its sources.
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
    for (let index = 0; index < peeledCount; index += 1) {
      const cardId = event.cardIds?.[index];
      if (cardId === undefined) continue;
      const artId = event.artIds?.[index];
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
    enqueue({
      id: `stack-strip-peel-${peels[0]!.key}`,
      track: `stackStripPeel-${permanentId}`,
      async run(context) {
        if (context.mode !== "live" || context.skipping) return;
        await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "stackStripPeel/causingEffect");
        for (const peel of peels) {
          if (context.cancelled || context.skipping) return;
          try {
            setDeleteBursts((bursts) => [...bursts, peel]);
            await context.wait(TIMINGS.stackStripPeel);
          } finally {
            setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== peel.key));
          }
        }
      },
    });
  }
}
