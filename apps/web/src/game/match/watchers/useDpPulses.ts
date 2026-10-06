import { useLayoutEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { GameState } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import type { StateSnapshot } from "../../../net/presentedState";
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
  preserveChanges = false,
  snapshots,
  contextOfRevision,
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
  /** Paced effects retain a transient gain even when its expiry is already live. */
  preserveChanges?: boolean;
  snapshots?: readonly StateSnapshot[];
  contextOfRevision?: (stateVersion: number) => { gate: PresentationGate | null; origin?: AnimationStep["origin"] };
}) {
  const lastStateVersionRef = useRef<number | undefined>(undefined);
  const dpSignature = state
    ? [...state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .map((permanent) => `${permanent.permanentId}:${permanent.currentDP}`)
        .join(",")
    : "";
  useLayoutEffect(() => {
    if (!state) {
      lastStateVersionRef.current = undefined;
      dpByPermanentRef.current = null;
      return;
    }
    const lastVersion = lastStateVersionRef.current;
    if (lastVersion !== undefined && state.stateVersion < lastVersion) dpByPermanentRef.current = null;
    // Every patch was copied before React could batch renders. Preserve a transient
    // gain even when the mutable live schema already shows its turn expiry.
    if (preserveChanges && dpByPermanentRef.current && lastVersion !== undefined) {
      for (const snapshot of snapshots ?? []) {
        if (snapshot.stateVersion > lastVersion && snapshot.stateVersion <= state.stateVersion) observe(snapshot.state);
      }
    }
    observe(state);
    lastStateVersionRef.current = state.stateVersion;

    function observe(read: GameState) {
      const current = new Map<string, number>();
      for (const player of read.players) {
        for (const permanent of player.battleArea) current.set(permanent.permanentId, permanent.currentDP);
        if (player.breeding) current.set(player.breeding.permanentId, player.breeding.currentDP);
      }
      const previous = dpByPermanentRef.current;
      dpByPermanentRef.current = current;
      if (!previous || queue.getMode() !== "live") return;
      const pulses = diffDpPulses({ previous, next: current, nextKey: dpPulseKeyRef.current });
      if (pulses.length === 0) return;
      dpPulseKeyRef.current += pulses.length;
      const revisionContext = preserveChanges ? contextOfRevision?.(read.stateVersion) : undefined;
      const causingEffectGate = revisionContext ? revisionContext.gate : causingEffectGateRef.current;
      const throughKey = stackStripKeyRef.current;
      const throughStateVersion = read.stateVersion;
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
          ...(revisionContext?.origin ? { origin: revisionContext.origin } : {}),
          track: `dpPulse-${pulse.permanentId}`,
          replace: !preserveChanges,
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpSignature, state?.stateVersion, preserveChanges ? snapshots : undefined]);
}
