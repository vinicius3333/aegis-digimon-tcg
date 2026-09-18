import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";

/** The gauge value the screen keeps until the clause that changed it has been read out. */
export interface MemoryHold {
  key: number;
  /** Raw `state.memory`, in the turn player's favour, before the effect moved it. */
  memory: number;
}

/**
 * Keeps the memory gauge where it was until the effect that moved it is announced.
 *
 * A clause such as "[Start of Your Main Phase] gain 1 memory" resolves in the same batch as
 * the phase change, and the presented board reaches that batch as soon as its ribbon
 * clears. Its toast reads later: behind the ribbon, then behind the glow on the source card.
 * Without the hold the gauge moved a full beat before the sentence that explains it. The
 * hold opens with the batch's announcement gate — the moment the clause is published — and
 * is capped like every other wait on that gate, so a clause that never reads cannot freeze
 * the gauge.
 *
 * Only a change that follows an effect in the batch is held. A play or digivolution cost
 * precedes its card's clause and is paid at once, as before.
 */
export function enqueueMemoryHold({
  fresh,
  announceGate,
  memoryHoldKeyRef,
  setHeldMemory,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  announceGate: PresentationGate | null;
  /** Mutated: incremented per hold, so a release only clears its own hold. */
  memoryHoldKeyRef: MutableRefObject<number>;
  setHeldMemory: Dispatch<SetStateAction<MemoryHold | undefined>>;
  enqueue: (step: AnimationStep) => void;
}) {
  if (!announceGate) return;
  const firstEffectIndex = fresh.findIndex((event) => event.kind === "effectTriggered");
  if (firstEffectIndex < 0) return;
  const effectMemoryChange = fresh.find(
    (event, index) => index > firstEffectIndex && event.kind === "memoryChanged" && event.from !== event.to,
  );
  if (!effectMemoryChange || effectMemoryChange.kind !== "memoryChanged") return;
  const hold: MemoryHold = { key: ++memoryHoldKeyRef.current, memory: effectMemoryChange.from };
  setHeldMemory(hold);
  enqueue({
    id: `memory-hold-${hold.key}`,
    track: "memoryHold",
    holdsBoard: false,
    blocksDecision: false,
    async run(context) {
      try {
        if (context.mode === "live")
          await waitForGate(announceGate, context, CONSEQUENCE_GATE_MAX_MS, "memoryHold/announce");
      } finally {
        setHeldMemory((current) => (current?.key === hold.key ? undefined : current));
      }
    },
  });
}
