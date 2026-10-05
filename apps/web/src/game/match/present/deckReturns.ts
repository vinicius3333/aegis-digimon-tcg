import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep, AnimationStepContext } from "../../animationQueue";
import type { StateSnapshot } from "../../../net/presentedState";
import { waitForStackStrips } from "../stackStripBarrier";
import { heldDeletionFrom } from "../heldDeletion";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { joinRemovalChain, startRemoval, waitForRemovalTurn, type RemovalLink } from "../removalChain";
import type { DrawFlightCard, HeldDeletion, MatchCueAnchors } from "../types";

export type FlyCardToDeck = (
  card: DrawFlightCard,
  from: { x: number; y: number; width?: number; height?: number; stackClone?: HTMLElement },
  seat: Seat,
  context: AnimationStepContext,
) => Promise<boolean>;

/**
 * A Digimon an effect returns from the field to a deck flies there face up from where it
 * stood, and it stays in place until its turn in the run of removals.
 */
export function enqueueDeckReturns({
  queue,
  fresh,
  snapshots,
  anchors,
  removalChainRef,
  causingEffectGate,
  holdKeyRef,
  setHeldDeletions,
  flyCardToDeck,
  enqueue,
}: {
  queue?: AnimationQueue;
  fresh: readonly ServerEvent[];
  snapshots: readonly StateSnapshot[];
  anchors: MatchCueAnchors;
  /** Mutated: the latest card an effect took off the field, which the next one follows. */
  removalChainRef: MutableRefObject<RemovalLink | null>;
  /** The clause that returned the card, read out before it leaves. */
  causingEffectGate: PresentationGate | null;
  /** Mutated: incremented per return so each hold gets its own key. */
  holdKeyRef: MutableRefObject<number>;
  setHeldDeletions: Dispatch<SetStateAction<ReadonlyMap<number, HeldDeletion>>>;
  flyCardToDeck: FlyCardToDeck;
  enqueue: (step: AnimationStep) => void;
}) {
  for (const event of fresh) {
    if (event.kind !== "cardsMoved" || (event.to !== "deckTop" && event.to !== "deckBottom")) continue;
    for (const returned of event.returnedPermanents ?? []) {
      const { seat, permanentId } = returned;
      const key = (holdKeyRef.current += 1);
      const releaseHold = () =>
        setHeldDeletions((held) => {
          if (!held.has(key)) return held;
          const next = new Map(held);
          next.delete(key);
          return next;
        });
      const held = heldDeletionFrom({ snapshots, seat, permanentId });
      if (held) setHeldDeletions((current) => new Map(current).set(key, held));
      const removal = joinRemovalChain(removalChainRef, true);
      const card: DrawFlightCard = { cardId: returned.cardId, ...(returned.artId ? { artId: returned.artId } : {}) };
      enqueue({
        id: `deck-return-${key}`,
        track: `deckReturn-${key}`,
        onDiscard() {
          startRemoval(removal);
          removal.link.finished?.release();
          releaseHold();
        },
        async run(context) {
          try {
            if (context.mode !== "live" || context.skipping) return;
            await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "deckReturn/causingEffect");
            if (context.cancelled || context.skipping) return;
            if (queue) await waitForStackStrips({ queue, context, throughKey: key, permanentId });
            if (context.cancelled || context.skipping) return;
            await waitForRemovalTurn(removal, context);
            if (context.cancelled || context.skipping) return;
            const from =
              anchors.permanentStack?.(permanentId) ??
              anchors.permanentFace?.(permanentId) ??
              anchors.permanentCenter?.(permanentId);
            startRemoval(removal);
            // The flying card takes over from the one on the board in the same commit.
            releaseHold();
            if (from) await flyCardToDeck(card, from, seat, context);
          } finally {
            startRemoval(removal);
            removal.link.finished?.release();
            releaseHold();
          }
        },
      });
    }
  }
}
