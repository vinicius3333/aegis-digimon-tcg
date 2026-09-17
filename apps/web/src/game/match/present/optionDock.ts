import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import type { SecurityBranchScene } from "../../securityClash";
import { SECURITY_BRANCH_IN_MS, SECURITY_DOCK_CLOSE_MS, TIMINGS } from "../../timings";
import { Side } from "../../side";
import { CueTrack } from "../enums";

/**
 * The card an Option was played from, parked at the side of the screen for as long as that
 * Option is resolving.
 *
 * A used Option has the same open-ended lifetime as a docked Security card: it starts at
 * `cardPlayed` and closes only when the server confirms the card's post-resolution routing.
 * Neither step blocks the decision barrier — the hold waits for the Option to finish, and the
 * Option finishes by the viewer ANSWERING its decision, so blocking on it deadlocks both.
 */
export function enqueueOptionDock({
  usedOption,
  optionRouted,
  viewerSeat,
  optionDockKeyRef,
  optionDockRef,
  decisionPendingRef,
  setOptionBranch,
  enqueue,
}: {
  usedOption: ServerEvent | undefined;
  /** True when the server already confirmed where the card went, so the dock may close. */
  optionRouted: boolean;
  viewerSeat: Seat;
  /** Mutated: incremented per dock so a new Option restarts the presentation. */
  optionDockKeyRef: MutableRefObject<number>;
  /** Mutated: the dock the Option track is holding open; the hold step polls it. */
  optionDockRef: MutableRefObject<{ key: number; closed: boolean } | null>;
  decisionPendingRef: MutableRefObject<boolean>;
  setOptionBranch: Dispatch<SetStateAction<SecurityBranchScene | null>>;
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
  optionDockRef.current = { key, closed: optionRouted };
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
      // those prompts, so an open decision holds it too — under the same ceiling.
      while (
        !context.cancelled &&
        (!optionDockRef.current?.closed || decisionPendingRef.current) &&
        waitedMs < TIMINGS.securityDockMax
      ) {
        await context.wait(TIMINGS.securityDockPoll);
        waitedMs += TIMINGS.securityDockPoll;
      }
      if (optionDockRef.current?.key === key) optionDockRef.current = null;
      setOptionBranch((current) => (current?.key === key ? { ...current, state: "closing" } : current));
      await context.wait(SECURITY_DOCK_CLOSE_MS);
      setOptionBranch((current) => (current?.key === key ? null : current));
    },
  });
}
