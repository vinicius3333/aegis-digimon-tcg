import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep, AnimationStepContext } from "../../animationQueue";
import type { SecurityBranchScene } from "../../securityClash";
import { SECURITY_BRANCH_IN_MS, SECURITY_DOCK_CLOSE_MS, TIMINGS } from "../../timings";
import { Side } from "../../side";
import { CueTrack } from "../enums";
import { createPresentationGate, type PresentationGate } from "../presentationGate";
import type { DrawFlightCard } from "../types";

/**
 * The card an Option was played from, parked at the side of the screen for as long as that
 * Option is resolving.
 *
 * A used Option has the same open-ended lifetime as a docked Security card: it starts at
 * `cardPlayed` and closes only when the server confirms the card's post-resolution routing.
 * Neither step blocks the decision barrier — the hold waits for the Option to finish, and the
 * Option finishes by the viewer ANSWERING its decision, so blocking on it deadlocks both.
 */
export interface OptionDockHold {
  key: number;
  closed: boolean;
  /** The state version whose batch routed the card; everything up to it is the Option's doing. */
  routedAtVersion?: number;
  /** The permanent the Option placed itself under (EX7-071), which the card flies into. */
  routedUnderPermanentId?: string;
  /** Released once the card has left the dock; what the server did after it waits for this. */
  settled: PresentationGate;
}

/** Flies the docked card into a permanent's digivolution cards; false when it cannot be drawn. */
export type FlyDockedOptionUnder = (
  card: DrawFlightCard,
  permanentId: string,
  context: AnimationStepContext,
) => Promise<boolean>;

export function enqueueOptionDock({
  queue,
  stateVersion,
  usedOption,
  optionRouted,
  routedUnderPermanentId,
  viewerSeat,
  optionDockKeyRef,
  optionDockRef,
  decisionPendingRef,
  decisionSourceCardIdRef,
  setOptionBranch,
  flyDockedOptionUnder,
  releaseTrashArrivalsThrough,
  enqueue,
}: {
  queue: AnimationQueue;
  /** The state version of the batch that used the Option. */
  stateVersion: number;
  usedOption: ServerEvent | undefined;
  /** True when the server already confirmed where the card went, so the dock may close. */
  optionRouted: boolean;
  /** Where that same batch placed the card, if it went under a permanent. */
  routedUnderPermanentId: string | undefined;
  viewerSeat: Seat;
  /** Mutated: incremented per dock so a new Option restarts the presentation. */
  optionDockKeyRef: MutableRefObject<number>;
  /** Mutated: the dock the Option track is holding open; the hold step polls it. */
  optionDockRef: MutableRefObject<OptionDockHold | null>;
  decisionPendingRef: MutableRefObject<boolean>;
  /** An unrelated effect's prompt must not keep an already routed Option open. */
  decisionSourceCardIdRef?: MutableRefObject<string | undefined>;
  setOptionBranch: Dispatch<SetStateAction<SecurityBranchScene | null>>;
  flyDockedOptionUnder: FlyDockedOptionUnder;
  /** An Option routed to the trash reaches the pile as its dock closes, not while docked. */
  releaseTrashArrivalsThrough: (stateVersion: number) => void;
  enqueue: (step: AnimationStep) => void;
}) {
  if (usedOption?.kind !== "cardPlayed") return;
  optionDockKeyRef.current += 1;
  const key = optionDockKeyRef.current;
  const dock: SecurityBranchScene = {
    key,
    cardId: usedOption.cardId,
    ...(usedOption.artId ? { artId: usedOption.artId } : {}),
    side: usedOption.seat === viewerSeat ? Side.Viewer : Side.Opponent,
    state: "docked",
    source: "option",
  };
  const settled = createPresentationGate();
  void queue.idle().then(() => settled.release());
  // A newer Option replacing this one in the ref leaves nothing waiting on this gate.
  optionDockRef.current?.settled.release();
  optionDockRef.current = {
    key,
    closed: optionRouted,
    settled,
    ...(optionRouted ? { routedAtVersion: stateVersion } : {}),
    ...(routedUnderPermanentId !== undefined ? { routedUnderPermanentId } : {}),
  };
  // The clause the Option raised and what it deleted are still on their way to the screen.
  const consequencesPending = () => {
    const routedAt = optionDockRef.current?.key === key ? optionDockRef.current.routedAtVersion : undefined;
    return (
      routedAt !== undefined &&
      queue.hasPendingStep(
        (step) =>
          (step.id.startsWith("narration-step-") || step.id.startsWith("delete-burst-")) &&
          step.origin !== undefined &&
          step.origin.stateVersion <= routedAt,
      )
    );
  };
  const ownDecisionPending = () =>
    decisionPendingRef.current &&
    (decisionSourceCardIdRef?.current === undefined || decisionSourceCardIdRef.current === usedOption.cardId);
  enqueue({
    id: `option-dock-in-${key}`,
    track: CueTrack.OptionDock,
    skippable: false,
    blocksDecision: false,
    async run(context) {
      setOptionBranch(dock);
      await context.wait(SECURITY_BRANCH_IN_MS);
    },
  });
  enqueue({
    id: `option-dock-hold-${key}`,
    track: CueTrack.OptionDockHold,
    skippable: false,
    blocksDecision: false,
    async run(context) {
      try {
        // Keep even a one-batch Option long enough for its activated effects to read.
        let waitedMs = 0;
        while (!context.cancelled && waitedMs < TIMINGS.optionDockHold) {
          await context.wait(TIMINGS.securityDockPoll);
          waitedMs += TIMINGS.securityDockPoll;
        }
        // The routing marker says the card left its no-area slot, which for a plain Option is
        // the end of its resolution. An Option that relocates ITSELF mid-clause (placing itself
        // as a security card, onto the field) is marked at that placement and goes on
        // resolving, so the marker alone would pull the card off screen while the viewer is
        // still answering prompts about it. The dock exists to keep it readable through exactly
        // those prompts, so its own open decision holds it too — under the same ceiling. A whole
        // Option can also arrive in one patch, routed before anything it did was drawn, so
        // the card stays until its clause and its deletions have played.
        while (
          !context.cancelled &&
          (!optionDockRef.current?.closed || ownDecisionPending() || consequencesPending()) &&
          waitedMs < TIMINGS.securityDockMax
        ) {
          await context.wait(TIMINGS.securityDockPoll);
          waitedMs += TIMINGS.securityDockPoll;
        }
        const underPermanentId =
          optionDockRef.current?.key === key ? optionDockRef.current.routedUnderPermanentId : undefined;
        const routedAtVersion = optionDockRef.current?.key === key ? optionDockRef.current.routedAtVersion : undefined;
        if (optionDockRef.current?.key === key) optionDockRef.current = null;
        if (underPermanentId === undefined && routedAtVersion !== undefined)
          releaseTrashArrivalsThrough(routedAtVersion);
        // An Option that placed itself under a Digimon is seen going there, not fading out.
        if (underPermanentId !== undefined && !context.cancelled) {
          const card = { cardId: dock.cardId, ...(dock.artId ? { artId: dock.artId } : {}) };
          const flying = flyDockedOptionUnder(card, underPermanentId, context);
          setOptionBranch((current) => (current?.key === key ? null : current));
          if (await flying) return;
        }
        setOptionBranch((current) => (current?.key === key ? { ...current, state: "closing" } : current));
        await context.wait(SECURITY_DOCK_CLOSE_MS);
        setOptionBranch((current) => (current?.key === key ? null : current));
      } finally {
        settled.release();
      }
    },
  });
}
