/* A one-way latch between presentation steps.
   Where a step has to wait for another beat whose length is not known in advance — a
   security check runs as long as the server takes to answer it — it waits on a gate rather
   than on a duration. The gate opens once, never closes, and every waiter is capped by a
   ceiling so a beat that never arrives cannot wedge the queue for good. */

import type { AnimationStepContext } from "../animationQueue";

export interface PresentationGate {
  open: boolean;
  opened: Promise<void>;
  release(): void;
}

const GATE_POLL_MS = 16;

/** How long anything queued behind an effect's announcement will wait for it. */
export const CONSEQUENCE_GATE_MAX_MS = 5_000;

export function createPresentationGate(): PresentationGate {
  let openGate = () => {};
  const opened = new Promise<void>((resolve) => {
    openGate = resolve;
  });
  const gate: PresentationGate = {
    open: false,
    opened,
    release() {
      if (gate.open) return;
      gate.open = true;
      openGate();
    },
  };
  return gate;
}

/**
 * How a wait ended. Every value but `expired` is a beat that was handed over on purpose;
 * `expired` means the ceiling fired instead, which is always a bug in whoever owned the
 * gate — the wait was supposed to be released, and the viewer sat through the ceiling.
 */
export type GateWaitOutcome = "open" | "released" | "expired" | "cancelled" | "skipped";

export interface GateExpiry {
  /** Names the wait, so a report says which beat stalled rather than just that one did. */
  label: string;
  ceilingMs: number;
}

const expiryObservers = new Set<(expiry: GateExpiry) => void>();

/** Watch for gates that ran out their ceiling. Returns the unsubscribe. */
export function observeGateExpiry(observer: (expiry: GateExpiry) => void): () => void {
  expiryObservers.add(observer);
  return () => {
    expiryObservers.delete(observer);
  };
}

export async function waitForGate(
  gate: PresentationGate | null | undefined,
  context: AnimationStepContext,
  ceilingMs: number,
  label: string,
): Promise<GateWaitOutcome> {
  if (!gate || gate.open) return "open";
  if (context.mode === "replay" || context.skipping) return "skipped";
  const deadline = Date.now() + ceilingMs;
  // A fast-forward is the viewer asking for the rest of it now. A gate is the one wait
  // that has no clock of its own, so it is also the one a skip has to break out of —
  // otherwise skipping releases every timed beat and leaves the queue sitting on this one.
  while (!gate.open && !context.cancelled && !context.skipping && Date.now() < deadline) {
    let stopPolling = () => {};
    const poll = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, GATE_POLL_MS);
      stopPolling = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    await Promise.race([gate.opened, poll]);
    stopPolling();
  }
  if (gate.open) return "released";
  if (context.cancelled) return "cancelled";
  if (context.skipping) return "skipped";
  for (const observer of [...expiryObservers]) observer({ label, ceilingMs });
  return "expired";
}

/** The deletion beat a card is waiting on, and the gate that says its shards have played. */
export interface DeletionReadyAt {
  readyAt: number;
  instanceId?: string;
  shattered?: PresentationGate;
}

/** The announcement gate a batch armed, and the cards it deleted before it could be raised. */
export interface PendingAnnounceGate {
  batchId: string;
  gate: PresentationGate;
  deleted: ReadonlySet<string>;
}
