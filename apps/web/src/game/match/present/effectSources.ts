import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import {
  effectActivationFromEvent,
  effectActivationTrack,
  type EffectActivation,
  type EffectSourceLookup,
} from "../../effectSource";
import { TIMINGS } from "../../timings";

/**
 * The activation moment plays where the effect came from: a permanent glows in place, a card
 * in the trash flies out of the pile, an Option rises out of the hand fan.
 *
 * A battle in the same batch owns the screen first, so every activation waits out the
 * battle's lead-in before it glows.
 */
export function enqueueEffectSources({
  fresh,
  usedOption,
  combatLeadInMs,
  cardSiteRef,
  effectSourceKeyRef,
  setEffectSources,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  /** The Option this batch played, if any: its dock below is the more legible presentation. */
  usedOption: ServerEvent | undefined;
  combatLeadInMs: number;
  /** Where every card the viewer can see currently sits, refreshed per commit. */
  cardSiteRef: MutableRefObject<{ locate: EffectSourceLookup }>;
  /** Mutated: incremented per event so each activation gets its own key. */
  effectSourceKeyRef: MutableRefObject<number>;
  setEffectSources: Dispatch<SetStateAction<readonly EffectActivation[]>>;
  enqueue: (step: AnimationStep) => void;
}) {
  for (const event of fresh) {
    effectSourceKeyRef.current += 1;
    // Do not also make the used Option's final trash position look like the source of its
    // own [Main] — the dock already shows where that effect came from.
    if (
      usedOption?.kind === "cardPlayed" &&
      event.kind === "effectActivated" &&
      event.sourceCardId === usedOption.cardId
    )
      continue;
    const activation = effectActivationFromEvent(event, effectSourceKeyRef.current, cardSiteRef.current.locate);
    if (!activation) continue;
    enqueue({
      id: `effect-source-${activation.key}`,
      track: effectActivationTrack(activation),
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        await context.wait(combatLeadInMs);
        if (context.cancelled) return;
        try {
          setEffectSources((sources) => [...sources, activation]);
          await context.wait(TIMINGS.effectSourceHold);
        } finally {
          setEffectSources((sources) => sources.filter((candidate) => candidate.key !== activation.key));
        }
      },
    });
  }
}
