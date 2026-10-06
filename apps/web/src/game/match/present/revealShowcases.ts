import type { Dispatch, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import { REVEAL_SHOWCASE_TOTAL_MS } from "../../timings";
import { CueTrack } from "../enums";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { runCardReveal } from "../cardReveal";

export interface RevealShowcaseCard {
  cardId: string;
  artId?: string;
}

/** Cards one opponent effect revealed, held up centre-screen in the order they were revealed. */
export interface RevealShowcase {
  key: number;
  seat: Seat;
  /** The card whose effect revealed them, when the server names it. */
  sourceCardId?: string;
  cards: readonly RevealShowcaseCard[];
  /** Positions of the physical reveal occurrences in this batch. */
  eventIndices: readonly number[];
}

/**
 * The opponent's reveals in one batch, grouped into one showcase per effect.
 *
 * A reveal exists to inform the other player, and a deck card turned face-up never reaches
 * the viewer's synchronized state, so the event is the only thing that can show it. The
 * viewer's own reveals are left out: when the viewer chooses among them, the decision
 * dialog already shows the same cards. The narration panel still lists the opponent's
 * reveals afterwards; this is the beat that makes the viewer look at them.
 */
export function revealShowcasesFromEvents(
  fresh: readonly ServerEvent[],
  viewerSeat: Seat,
  nextKey: () => number,
): RevealShowcase[] {
  const showcases: RevealShowcase[] = [];
  for (const [eventIndex, event] of fresh.entries()) {
    if (event.kind !== "cardRevealed" || event.seat === viewerSeat) continue;
    const card = { cardId: event.cardId, ...(event.artId ? { artId: event.artId } : {}) };
    const last = showcases.at(-1);
    if (last && last.seat === event.seat && last.sourceCardId === event.sourceCardId) {
      showcases[showcases.length - 1] = {
        ...last,
        cards: [...last.cards, card],
        eventIndices: [...last.eventIndices, eventIndex],
      };
      continue;
    }
    showcases.push({
      key: nextKey(),
      seat: event.seat,
      ...(event.sourceCardId !== undefined ? { sourceCardId: event.sourceCardId } : {}),
      cards: [card],
      eventIndices: [eventIndex],
    });
  }
  return showcases;
}

/**
 * One centre-stage beat per showcase. It waits for the clause that caused the reveal to be
 * read, then holds the cards long enough to read them. Like the zone showcase, it is motion
 * over information the match log also keeps, so a replay, a drained queue or a fast-forward
 * drops it.
 */
export function enqueueRevealShowcases({
  queue,
  showcases,
  causingEffectGate,
  setRevealShowcase,
  enqueue,
  completionGates,
}: {
  queue: AnimationQueue;
  showcases: readonly RevealShowcase[];
  causingEffectGate: PresentationGate | null;
  setRevealShowcase: Dispatch<SetStateAction<RevealShowcase | null>>;
  enqueue: (step: AnimationStep) => void;
  completionGates?: ReadonlyMap<number, PresentationGate>;
}) {
  for (const showcase of showcases)
    enqueue({
      id: `reveal-showcase-${showcase.key}`,
      track: CueTrack.CenterStage,
      onDiscard: () => {
        completionGates?.get(showcase.key)?.after?.release();
        completionGates?.get(showcase.key)?.release();
      },
      async run(context) {
        try {
          if (context.mode !== "live" || context.skipping) return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "revealShowcase/causingEffect");
          if (context.cancelled || context.skipping) return;
          completionGates?.get(showcase.key)?.after?.release();
          await runCardReveal({
            queue,
            context,
            id: `card-reveal-row-${showcase.key}`,
            duration: REVEAL_SHOWCASE_TOTAL_MS,
            show: () => setRevealShowcase(showcase),
            clear: () => setRevealShowcase((current) => (current?.key === showcase.key ? null : current)),
          });
        } finally {
          completionGates?.get(showcase.key)?.after?.release();
          completionGates?.get(showcase.key)?.release();
        }
      },
    });
}
