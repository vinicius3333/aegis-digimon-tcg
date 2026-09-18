import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { GameState } from "@aegis/shared";
import type { AnimationQueue } from "../../animationQueue";
import { freezePulses as diffFreezePulses, type FreezeFlags, type FreezePulse } from "../../freezePulse";
import { TIMINGS } from "../../timings";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";

/**
 * A permanent that just had "can't attack" / "can't block" imposed on it jolts.
 *
 * The driver is the server's own projection of those restrictions, so nothing here reads card
 * text; a permanent that entered already restricted is not a moment, which is what the
 * baseline read keeps out.
 *
 * The jolt on the card and the badge under it already say the Digimon lost the action, and
 * the effect's own clause is on screen beside them, so there is no notice. Several permanents
 * can be locked by one resolution, so each jolts on its own track.
 */
export function useRestrictionPulses({
  state,
  queue,
  restrictionsByPermanentRef,
  freezePulseKeyRef,
  causingEffectGateRef,
  setFreezePulses,
}: {
  state: GameState | undefined;
  queue: AnimationQueue;
  /** Mutated: last read of every permanent's restrictions, so the next commit can diff it. */
  restrictionsByPermanentRef: MutableRefObject<Map<string, FreezeFlags> | null>;
  freezePulseKeyRef: MutableRefObject<number>;
  /** The clause that imposed the lock, which is read out before the card jolts. */
  causingEffectGateRef: MutableRefObject<PresentationGate | null>;
  setFreezePulses: Dispatch<SetStateAction<ReadonlyMap<string, FreezePulse>>>;
}) {
  const restrictionSignature = state
    ? [...state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .map(
          (permanent) => `${permanent.permanentId}:${permanent.cannotAttack ? 1 : 0}${permanent.cannotBlock ? 1 : 0}`,
        )
        .join(",")
    : "";
  useEffect(() => {
    if (!state) return;
    const current = new Map<string, FreezeFlags>();
    for (const player of state.players) {
      for (const permanent of player.battleArea) {
        current.set(permanent.permanentId, {
          cannotAttack: permanent.cannotAttack,
          cannotBlock: permanent.cannotBlock,
        });
      }
    }
    const previous = restrictionsByPermanentRef.current;
    restrictionsByPermanentRef.current = current;
    if (!previous || queue.getMode() !== "live") return;
    const pulses = diffFreezePulses({ previous, next: current, nextKey: freezePulseKeyRef.current });
    if (pulses.length === 0) return;
    freezePulseKeyRef.current += pulses.length;
    const causingEffectGate = causingEffectGateRef.current;
    for (const pulse of pulses) {
      queue.enqueue({
        id: `freeze-pulse-${pulse.key}`,
        track: `freezePulse-${pulse.permanentId}`,
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "restrictionPulse/causingEffect");
          if (context.cancelled) return;
          try {
            setFreezePulses((pulsing) => new Map(pulsing).set(pulse.permanentId, pulse));
            await context.wait(TIMINGS.freezeShake);
          } finally {
            setFreezePulses((pulsing) => {
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
  }, [restrictionSignature]);
}
