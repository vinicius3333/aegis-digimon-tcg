import { useLayoutEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { GameState } from "@aegis/shared";
import type { AnimationQueue } from "../../animationQueue";
import { dpPulses as diffDpPulses, type DpPulse } from "../../dpPulse";
import { dpPulseTotalMs } from "../../timings";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";
import { waitForStackStrips } from "../stackStripBarrier";

/**
 * A DP figure that moved gets a pulse.
 *
 * The driver is the synchronized `currentDP` itself: the engine has already applied every
 * modifier by the time the number changes, so nothing here re-derives a rule. The first read
 * is only a baseline, which is what keeps a reconnect from pulsing the whole board.
 *
 * Several figures can move in one resolution, so each card pulses on its own track rather
 * than queueing behind another card's.
 */
export function useDpPulses({
  state,
  queue,
  dpByPermanentRef,
  dpPulseKeyRef,
  causingEffectGateRef,
  stackStripKeyRef,
  setDpPulses,
  setDpBadgeSuppressions,
}: {
  state: GameState | undefined;
  queue: AnimationQueue;
  /** Mutated: last read of every permanent's live DP, so the next commit can diff it. */
  dpByPermanentRef: MutableRefObject<Map<string, number> | null>;
  dpPulseKeyRef: MutableRefObject<number>;
  /** The clause that moved the figure, which is read out before the number pulses. */
  causingEffectGateRef: MutableRefObject<PresentationGate | null>;
  stackStripKeyRef: MutableRefObject<number>;
  setDpPulses: Dispatch<SetStateAction<ReadonlyMap<string, DpPulse>>>;
  setDpBadgeSuppressions: Dispatch<SetStateAction<ReadonlyMap<string, number>>>;
}) {
  const dpSignature = state
    ? [...state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .map((permanent) => `${permanent.permanentId}:${permanent.currentDP}`)
        .join(",")
    : "";
  useLayoutEffect(() => {
    if (!state) return;
    const current = new Map<string, number>();
    for (const player of state.players) {
      for (const permanent of player.battleArea) current.set(permanent.permanentId, permanent.currentDP);
      if (player.breeding) current.set(player.breeding.permanentId, player.breeding.currentDP);
    }
    const previous = dpByPermanentRef.current;
    dpByPermanentRef.current = current;
    if (!previous || queue.getMode() !== "live") return;
    const pulses = diffDpPulses({ previous, next: current, nextKey: dpPulseKeyRef.current });
    if (pulses.length === 0) return;
    dpPulseKeyRef.current += pulses.length;
    const causingEffectGate = causingEffectGateRef.current;
    const throughKey = stackStripKeyRef.current;
    const throughStateVersion = state.stateVersion;
    for (const pulse of pulses) {
      setDpBadgeSuppressions((suppressed) => new Map(suppressed).set(pulse.permanentId, pulse.key));
      function release() {
        setDpPulses((pulsing) => {
          if (pulsing.get(pulse.permanentId)?.key !== pulse.key) return pulsing;
          const next = new Map(pulsing);
          next.delete(pulse.permanentId);
          return next;
        });
        setDpBadgeSuppressions((suppressed) => {
          if (suppressed.get(pulse.permanentId) !== pulse.key) return suppressed;
          const next = new Map(suppressed);
          next.delete(pulse.permanentId);
          return next;
        });
      }
      queue.enqueue({
        id: `dp-pulse-${pulse.key}`,
        track: `dpPulse-${pulse.permanentId}`,
        replace: true,
        onDiscard: release,
        async run(context) {
          try {
            if (context.mode !== "live" || context.skipping) return;
            await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "dpPulse/causingEffect");
            await waitForStackStrips({ queue, context, throughKey, throughStateVersion });
            if (context.cancelled || context.skipping) return;
            setDpPulses((pulsing) => new Map(pulsing).set(pulse.permanentId, pulse));
            await context.wait(dpPulseTotalMs(pulse.kind === "debuffFatal"));
          } finally {
            release();
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpSignature]);
}
