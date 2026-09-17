import type { Dispatch, SetStateAction } from "react";
import type { AnimationStep } from "../../animationQueue";
import type { AttackAnnouncement } from "../../sidePanels";
import { TIMINGS } from "../../timings";

/**
 * The attacker's call-out, held on screen for its own beat.
 *
 * `replace`: a second declaration in the same batch is the only announcement worth reading,
 * so it takes the track from the first.
 */
export function enqueueAttackAnnouncement({
  announcement,
  setAttackAnnouncement,
  enqueue,
}: {
  announcement: AttackAnnouncement | null;
  setAttackAnnouncement: Dispatch<SetStateAction<AttackAnnouncement | null>>;
  enqueue: (step: AnimationStep) => void;
}) {
  if (!announcement) return;
  const shown = announcement;
  enqueue({
    id: `attack-announce-${shown.id}`,
    track: "attackAnnounce",
    replace: true,
    skippable: false,
    async run(context) {
      setAttackAnnouncement(shown);
      await context.wait(TIMINGS.attackAnnounce);
      if (context.cancelled) return;
      setAttackAnnouncement(null);
    },
  });
}
