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

export async function waitForGate(
  gate: PresentationGate | null | undefined,
  context: AnimationStepContext,
  ceilingMs: number,
): Promise<void> {
  if (!gate || gate.open || context.mode === "replay") return;
  const deadline = Date.now() + ceilingMs;
  while (!gate.open && !context.cancelled && Date.now() < deadline) {
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
