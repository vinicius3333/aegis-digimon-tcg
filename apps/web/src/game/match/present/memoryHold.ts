import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import { TIMINGS } from "../../timings";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "../presentationGate";

/** The gauge value the screen keeps until the clause that changed it has been read out. */
export interface MemoryHold {
  key: number;
  /** Raw `state.memory`, in the turn player's favour, before the effect moved it. */
  memory: number;
  /**
   * Which seat the raw value above is signed for. Held alongside the number because an
   * effect that spends the turn player's last memory also ends the turn: the live seat moves
   * on at once, and the gauge would flip to the other player before its clause had read.
   */
  turnSeat: Seat;
}

/**
 * Keeps the memory gauge where it was until the effect that moved it is announced.
 *
 * A clause such as "[Start of Your Main Phase] gain 1 memory" resolves in the same batch as
 * the phase change, and the presented board reaches that batch as soon as its ribbon
 * clears. Its toast reads later: behind the ribbon, then behind the glow on the source card.
 * Without the hold the gauge moved a full beat before the sentence that explains it. The
 * hold opens one reading beat after the batch's announcement gate — the gate fires as the
 * clause is published, so releasing on it moved the gauge in the same frame as the toast.
 * Waiting `effectAnnounce` past it lets the sentence be read before its consequence shows on
 * the gauge. The gate wait is capped like every other wait on that gate, and a gate that
 * expired gets no extra beat, so a clause that never reads cannot freeze the gauge.
 *
 * Only a change that follows an effect in the batch is held. A play or digivolution cost
 * precedes its card's clause and is paid at once, as before.
 */
export function enqueueMemoryHold({
  fresh,
  announceGate,
  turnSeat,
  memoryHoldKeyRef,
  setHeldMemory,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  announceGate: PresentationGate | null;
  /** The seat the gauge is read from until this batch's turn change is presented. */
  turnSeat: Seat;
  /** Mutated: incremented per hold, so a release only clears its own hold. */
  memoryHoldKeyRef: MutableRefObject<number>;
  setHeldMemory: Dispatch<SetStateAction<MemoryHold | undefined>>;
  enqueue: (step: AnimationStep) => void;
}) {
  if (!announceGate) return;
  const firstEffectIndex = fresh.findIndex((event) => event.kind === "effectTriggered");
  if (firstEffectIndex < 0) return;
  const memoryChangeIndex = fresh.findIndex(
    (event, index) => index > firstEffectIndex && event.kind === "memoryChanged" && event.from !== event.to,
  );
  const effectMemoryChange = memoryChangeIndex < 0 ? undefined : fresh[memoryChangeIndex];
  if (!effectMemoryChange || effectMemoryChange.kind !== "memoryChanged") return;
  const hold: MemoryHold = { key: ++memoryHoldKeyRef.current, memory: effectMemoryChange.from, turnSeat };
  setHeldMemory(hold);
  enqueue({
    id: `memory-hold-${hold.key}`,
    track: "memoryHold",
    holdsBoard: false,
    blocksDecision: false,
    // There is a sentence to read before the gauge may answer it, so this beat keeps its
    // real duration even while the queue is draining a backlog.
    skippable: false,
    async run(context) {
      try {
        const outcome = await waitForGate(announceGate, context, CONSEQUENCE_GATE_MAX_MS, "memoryHold/announce");
        if (outcome === "open" || outcome === "released") await context.wait(TIMINGS.effectAnnounce);
      } finally {
        setHeldMemory((current) => (current?.key === hold.key ? undefined : current));
      }
    },
  });
}
