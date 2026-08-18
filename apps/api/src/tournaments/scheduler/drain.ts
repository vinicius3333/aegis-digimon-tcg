import { logError } from "../../logger.js";

/**
 * The deployment drain, as an ordering rather than as a chain buried in `index.ts`.
 *
 * The order is the whole point and it is not interchangeable: the deadline worker stops FIRST and
 * is awaited, and only then do the rooms shut down. A worker still running while Colyseus tears
 * rooms down would be applying no-show penalties and closing rounds against confrontations whose
 * rooms are disappearing underneath it — a player disconnected by the deploy would be indistinguishable
 * from one who never turned up, and the penalty would be recorded as if they had not.
 *
 * Nothing depends on the worker finishing: a lease left behind lapses in seconds and another
 * instance retries the same idempotent command. Awaiting simply lets the pass in flight finish its
 * command instead of being killed mid-write, which is what keeps the queue's log honest.
 *
 * A worker that fails to stop is logged and does NOT stop the rooms from being drained — refusing
 * to shut down because a background loop misbehaved would hold the port and fail the deploy.
 */
export async function drainForShutdown(steps: {
  stopDeadlineWorker: () => Promise<void> | void;
  shutdownRooms: () => Promise<void> | void;
}): Promise<void> {
  try {
    await steps.stopDeadlineWorker();
  } catch (error) {
    logError("[aegis/api] deadline worker stop failed:", error);
  }
  await steps.shutdownRooms();
}
