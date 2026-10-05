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
import { EFFECT_SPEED_SCALE, getEffectSpeed } from "../../pacing";
import { waitForTrashSourceClock } from "./trashSourceClock";
import { waitForHandSourceClock } from "./handSourceClock";
import { effectActivationPreparationMs } from "../../effectSource";
import { waitForGate, CONSEQUENCE_GATE_MAX_MS, type PresentationGate } from "../presentationGate";

/**
 * The activation moment plays where the effect came from: a permanent glows in place, a card
 * in the trash flies out of the pile, an Option rises out of the hand fan.
 *
 * A battle in the same batch owns the screen first, so every activation waits out the
 * battle's lead-in before it glows.
 */
export function enqueueEffectSources({
  fresh,
  groupedTriggers = [],
  usedOption,
  combatLeadInMs,
  combatCompletionGate,
  cardSiteRef,
  effectSourceKeyRef,
  setEffectSources,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  /** Accepted copies sharing a clause still identify each physical source. */
  groupedTriggers?: readonly ServerEvent[];
  /** The Option this batch played, if any: its dock below is the more legible presentation. */
  usedOption: ServerEvent | undefined;
  combatLeadInMs: number;
  combatCompletionGate?: PresentationGate;
  /** Where every card the viewer can see currently sits, refreshed per commit. */
  cardSiteRef: MutableRefObject<{ locate: EffectSourceLookup }>;
  /** Mutated: incremented per event so each activation gets its own key. */
  effectSourceKeyRef: MutableRefObject<number>;
  setEffectSources: Dispatch<SetStateAction<readonly EffectActivation[]>>;
  enqueue: (step: AnimationStep) => void;
}) {
  for (const event of fresh) {
    effectSourceKeyRef.current += 1;
    // effectActivated is a completion marker for direct abilities. A matching accepted
    // announcement owns its focus already; completion must not flash the source twice.
    if (
      event.kind === "effectActivated" &&
      fresh.some(
        (candidate) =>
          (candidate.kind === "effectTriggered" || candidate.kind === "effectResolved") &&
          candidate.seat === event.seat &&
          candidate.sourceCardId === event.sourceCardId &&
          candidate.effectKey === event.effectKey,
      )
    )
      continue;
    // Do not also make the used Option's final trash position look like the source of its
    // own [Main] — the dock already shows where that effect came from.
    if (
      usedOption?.kind === "cardPlayed" &&
      event.kind === "effectActivated" &&
      event.sourceCardId === usedOption.cardId
    )
      continue;
    const site =
      event.kind === "effectTriggered" && groupedTriggers.includes(event)
        ? cardSiteRef.current.locate(event.sourceCardId, event.seat, event)
        : undefined;
    const activation: EffectActivation | null =
      site && event.kind === "effectTriggered"
        ? { key: effectSourceKeyRef.current, seat: event.seat, cardId: event.sourceCardId, site }
        : effectActivationFromEvent(event, effectSourceKeyRef.current, cardSiteRef.current.locate);
    if (!activation) continue;
    enqueue({
      id: `effect-source-${activation.key}`,
      track: effectActivationTrack(activation),
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        await context.wait(combatLeadInMs);
        await waitForGate(combatCompletionGate, context, CONSEQUENCE_GATE_MAX_MS, "effectSource/paintedImpact");
        if (context.cancelled) return;
        try {
          if (activation.site.zone === "trash" || activation.site.zone === "hand")
            activation.motionScale = EFFECT_SPEED_SCALE[getEffectSpeed()];
          setEffectSources((sources) => [...sources, activation]);
          // This standalone cue has no clause owner to keep its final shrink mounted.
          const duration =
            activation.site.zone === "trash"
              ? TIMINGS.effectTrashRise * (activation.motionScale ?? 1)
              : effectActivationPreparationMs(activation.site, TIMINGS.effectSourceHold, activation.motionScale);
          await context.wait(duration);
          if (activation.site.zone === "trash") await waitForTrashSourceClock(activation.key, duration, context);
          if (activation.site.zone === "hand")
            await waitForHandSourceClock(
              activation.key,
              TIMINGS.effectHandPreparation * (activation.motionScale ?? 1),
              context,
            );
        } finally {
          setEffectSources((sources) => sources.filter((candidate) => candidate.key !== activation.key));
        }
      },
    });
  }
}
