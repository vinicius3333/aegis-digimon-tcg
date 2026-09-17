import type { Dispatch, SetStateAction } from "react";
import { CueTrack, SecurityBreakPhase } from "../enums";
import type { SecurityBreakCue } from "../types";
import { SECURITY_BREAK_TIMINGS, type SecurityBreakScene } from "../../securityClash";
import { TIMINGS } from "../../timings";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";

/**
 * The beat before the reveal: the defender's shield arms, its glass shatters, and the
 * board holds while the shards clear. Pure motion — the clash that follows carries the
 * information — so it is skipped outright unless the queue is live.
 */
export function shieldBreakStep({
  queue,
  setSecurityBreak,
  setSecurityHitSeat,
  scene,
  replace = true,
  clausesBefore,
}: {
  queue: AnimationQueue;
  setSecurityBreak: Dispatch<SetStateAction<SecurityBreakCue | null>>;
  setSecurityHitSeat: Dispatch<SetStateAction<number | null>>;
  scene: SecurityBreakScene;
  replace?: boolean;
  clausesBefore?: string;
}): AnimationStep {
  return {
    id: `security-break-${scene.key}`,
    track: CueTrack.CenterStage,
    // The check owns the centre of the screen from here, so whatever was being
    // announced there gives way at the break rather than during the reveal. Only the
    // FIRST break of a run takes the track: a destruction that spends several cards
    // breaks the same shield once per card, and each of those would otherwise cancel
    // the card before it.
    replace,
    async run(context) {
      if (context.mode !== "live") return;
      // Whatever the attack itself raised reads before the shield breaks. The server
      // resolves a [When Attacking] effect ahead of the reveal, but its toast glows the
      // source card first, so without this wait the check opened over a clause that had
      // not arrived yet and looked like it had fired afterwards.
      if (clausesBefore !== undefined) {
        const deadline = Date.now() + TIMINGS.securityClauseLead;
        while (
          !context.cancelled &&
          !context.skipping &&
          Date.now() < deadline &&
          queue.hasPendingStep(
            (step) => step.id.startsWith("narration-step-") && step.origin?.batchId !== clausesBefore,
          )
        )
          await context.wait(16);
        if (context.cancelled) return;
      }
      try {
        setSecurityBreak({ ...scene, phase: SecurityBreakPhase.Arm });
        await context.wait(SECURITY_BREAK_TIMINGS.armMs);
        if (context.cancelled) return;
        setSecurityBreak({ ...scene, phase: SecurityBreakPhase.Break });
        setSecurityHitSeat(scene.seat);
        await context.wait(SECURITY_BREAK_TIMINGS.breakMs + SECURITY_BREAK_TIMINGS.holdMs);
      } finally {
        // A replacing cue cancels the wait; the shield must not be left mid-break.
        setSecurityBreak((current) => (current?.key === scene.key ? null : current));
        setSecurityHitSeat((seat) => (seat === scene.seat ? null : seat));
      }
    },
  };
}
