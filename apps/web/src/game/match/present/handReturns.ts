import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep, AnimationStepContext } from "../../animationQueue";
import type { StateSnapshot } from "../../../net/presentedState";
import type { FieldShatterFace } from "../../fieldShatter";
import { waitForStackStrips } from "../stackStripBarrier";
import { heldDeletionFrom } from "../heldDeletion";
import {
  CONSEQUENCE_GATE_MAX_MS,
  createPresentationGate,
  waitForGate,
  type PresentationGate,
} from "../presentationGate";
import { joinRemovalChain, startRemoval, waitForRemovalTurn, type RemovalLink } from "../removalChain";
import type { DrawFlightCard, HeldDeletion, MatchCueAnchors } from "../types";

type ReturnedPermanent = NonNullable<Extract<ServerEvent, { kind: "cardsMoved" }>["returnedPermanents"]>[number];
export type HandReturnPlan = {
  returns: readonly ReturnedPermanent[];
  completed: PresentationGate;
  lastStarted: PresentationGate;
  beforeEntry: ReadonlyMap<string, PresentationGate>;
};
export type FlyCardToHand = (
  card: DrawFlightCard,
  from: FieldShatterFace,
  seat: Seat,
  context: AnimationStepContext,
) => Promise<boolean>;

/** Only public whole-permanent receipts own a field departure; other additions enter normally. */
export function planHandReturns(fresh: readonly ServerEvent[]): HandReturnPlan {
  const returns = fresh.flatMap((event) =>
    event.kind === "cardsMoved" && event.to === "hand" && event.handAddition !== "staging"
      ? (event.returnedPermanents ?? []).filter((returned) => event.instanceIds.includes(returned.instanceId))
      : [],
  );
  const completed = createPresentationGate();
  const lastStarted = createPresentationGate();
  completed.after = lastStarted;
  if (!returns.length) {
    lastStarted.release();
    completed.release();
  }
  return {
    returns,
    completed,
    lastStarted,
    beforeEntry: new Map(returns.map((returned) => [returned.instanceId, completed])),
  };
}

/** Each complete stack departs in order; their cards enter the hand after the last return. */
export function enqueueHandReturns({
  queue,
  plan,
  snapshots,
  anchors,
  removalChainRef,
  causingEffectGate,
  holdKeyRef,
  setHeldDeletions,
  flyCardToHand,
  enqueue,
}: {
  queue?: AnimationQueue;
  plan: HandReturnPlan;
  snapshots: readonly StateSnapshot[];
  anchors: MatchCueAnchors;
  removalChainRef: MutableRefObject<RemovalLink | null>;
  causingEffectGate: PresentationGate | null;
  holdKeyRef: MutableRefObject<number>;
  setHeldDeletions: Dispatch<SetStateAction<ReadonlyMap<number, HeldDeletion>>>;
  flyCardToHand: FlyCardToHand;
  enqueue: (step: AnimationStep) => void;
}) {
  let remaining = plan.returns.length;
  for (const returned of plan.returns) {
    const key = (holdKeyRef.current += 1);
    const held = heldDeletionFrom({ snapshots, seat: undefined, permanentId: returned.permanentId });
    if (held) setHeldDeletions((current) => new Map(current).set(key, held));
    const removal = joinRemovalChain(removalChainRef, true);
    removal.link.started.after =
      removal.previous?.finished ?? removal.previous?.started ?? causingEffectGate ?? undefined;
    removal.link.finished!.after = removal.link.started;
    let finished = false;
    function releaseHold() {
      setHeldDeletions((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    }
    function finish() {
      if (finished) return;
      finished = true;
      startRemoval(removal);
      removal.link.finished!.release();
      releaseHold();
      if (--remaining === 0) {
        plan.lastStarted.release();
        plan.completed.release();
      }
    }
    enqueue({
      id: `hand-return-${key}`,
      track: `handReturn-${key}`,
      onDiscard: finish,
      async run(context) {
        try {
          if (context.mode !== "live" || context.skipping) return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "handReturn/causingEffect");
          if (context.cancelled || context.skipping) return;
          if (queue) await waitForStackStrips({ queue, context, throughKey: key, permanentId: returned.permanentId });
          if (context.cancelled || context.skipping) return;
          await waitForRemovalTurn(removal, context);
          if (context.cancelled || context.skipping) return;
          const from = anchors.permanentStack?.(returned.permanentId) ?? anchors.permanentFace?.(returned.permanentId);
          startRemoval(removal);
          if (returned === plan.returns.at(-1)) plan.lastStarted.release();
          releaseHold();
          if (from)
            await flyCardToHand(
              { cardId: returned.cardId, ...(returned.artId ? { artId: returned.artId } : {}) },
              from,
              returned.seat,
              context,
            );
        } finally {
          finish();
        }
      },
    });
  }
}
