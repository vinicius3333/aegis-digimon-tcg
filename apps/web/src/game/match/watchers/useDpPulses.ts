import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { GameState } from "@aegis/shared";
import type { AnimationQueue } from "../../animationQueue";
import { dpPulses as diffDpPulses, type DpPulse } from "../../dpPulse";
import { dpPulseTotalMs } from "../../timings";

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
  setDpPulses,
}: {
  state: GameState | undefined;
  queue: AnimationQueue;
  /** Mutated: last read of every permanent's live DP, so the next commit can diff it. */
  dpByPermanentRef: MutableRefObject<Map<string, number> | null>;
  dpPulseKeyRef: MutableRefObject<number>;
  setDpPulses: Dispatch<SetStateAction<ReadonlyMap<string, DpPulse>>>;
}) {
  const dpSignature = state
    ? [...state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .map((permanent) => `${permanent.permanentId}:${permanent.currentDP}`)
        .join(",")
    : "";
  useEffect(() => {
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
    for (const pulse of pulses) {
      queue.enqueue({
        id: `dp-pulse-${pulse.key}`,
        track: `dpPulse-${pulse.permanentId}`,
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          try {
            setDpPulses((pulsing) => new Map(pulsing).set(pulse.permanentId, pulse));
            await context.wait(dpPulseTotalMs(pulse.kind === "debuffFatal"));
          } finally {
            setDpPulses((pulsing) => {
              if (pulsing.get(pulse.permanentId)?.key !== pulse.key) return pulsing;
              const next = new Map(pulsing);
              next.delete(pulse.permanentId);
              return next;
            });
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpSignature]);
}
