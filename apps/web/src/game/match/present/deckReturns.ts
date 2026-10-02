import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep, AnimationStepContext } from "../../animationQueue";
import type { StateSnapshot } from "../../../net/presentedState";
import { heldDeletionFrom } from "../heldDeletion";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { joinRemovalChain, startRemoval, waitForRemovalTurn, type RemovalLink } from "../removalChain";
import type { DrawFlightCard, HeldDeletion, MatchCueAnchors } from "../types";

export type FlyCardToDeck = (
  card: DrawFlightCard,
  from: { x: number; y: number },
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
  queue: AnimationQueue;
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
    if (event.kind !== "cardsMoved") continue;
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
      const removal = joinRemovalChain(removalChainRef);
      const card: DrawFlightCard = { cardId: returned.cardId, ...(returned.artId ? { artId: returned.artId } : {}) };
      enqueue({
        id: `deck-return-${key}`,
        track: `deckReturn-${key}`,
        async run(context) {
          try {
            if (context.mode !== "live") return;
            await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "deckReturn/causingEffect");
            if (context.cancelled) return;
            await waitForRemovalTurn(removal, context);
            if (context.cancelled) return;
            const from = anchors.permanentCenter?.(permanentId);
            startRemoval(removal);
            // The flying card takes over from the one on the board in the same commit.
            releaseHold();
            if (from) await flyCardToDeck(card, from, seat, context);
          } finally {
            startRemoval(removal);
            releaseHold();
          }
        },
      });
      // Registered after the enqueue, as with a deletion's hold: a step a later `replace` drops
      // never runs, and on an idle queue the promise would settle before the step began.
      void queue.idle().then(() => {
        startRemoval(removal);
        releaseHold();
      });
    }
  }
}
