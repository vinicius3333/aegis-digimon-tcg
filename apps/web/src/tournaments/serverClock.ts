/* Server-authoritative time for the tournament screens.
   Every deadline the UI counts down to is a server timestamp, so comparing it to a local
   `Date.now()` shows the player their own clock skew as if it were tournament time. The API does
   not yet publish a `serverNow` field on every payload, but every HTTP response carries a `Date`
   header, which is the same clock. All countdowns are `deadlineAt - serverNow()`.

   Two corrections keep the estimate honest:

   - **Latency.** A response observed at `receivedAt` was stamped somewhere inside the round trip,
     so the sample is anchored at the RTT midpoint rather than at arrival. `Date` headers are also
     truncated to whole seconds, so the true instant is uniformly distributed over the following
     second and the midpoint of that window is the best point estimate.
   - **Sample quality.** The narrowest round trip bounds the error, so the BEST sample wins rather
     than the newest: a slow response must not yank a live countdown backwards across a warning
     threshold. A best sample older than `SAMPLE_TTL_MS` is stale and yields to any newer one, so
     genuine drift is still tracked. */

export type ClockSample = {
  /** The server instant, from a `Date` header or a `serverNow` field. */
  serverEpochMs: number;
  /** When the request left the client. */
  sentAt: number;
  /** When the response was observed. */
  receivedAt: number;
  /** Resolution of `serverEpochMs`: 1000 for a `Date` header, 0 for a millisecond field. */
  granularityMs?: number;
};

const SAMPLE_TTL_MS = 5 * 60_000;

type Sample = { offsetMs: number; roundTripMs: number; observedAt: number };

let best: Sample | undefined;
const listeners = new Set<() => void>();

/** Feeds one observation of the server clock. Keeps it only if it is the sharpest one we have. */
export function observeServerTime(sample: ClockSample): void {
  const { serverEpochMs, sentAt, receivedAt, granularityMs = 0 } = sample;
  if (!Number.isFinite(serverEpochMs) || !Number.isFinite(sentAt) || !Number.isFinite(receivedAt)) return;

  const roundTripMs = Math.max(0, receivedAt - sentAt);
  const offsetMs = serverEpochMs + granularityMs / 2 - (sentAt + receivedAt) / 2;
  const stale = best !== undefined && receivedAt - best.observedAt > SAMPLE_TTL_MS;
  if (best !== undefined && !stale && roundTripMs > best.roundTripMs) return;

  // Only a whole-second move is published: subscribers re-arm one-second timers, and sub-second
  // corrections still take effect through `serverNow()` without disturbing them.
  const previousSeconds = serverClockOffsetSeconds();
  best = { offsetMs, roundTripMs, observedAt: receivedAt };
  if (serverClockOffsetSeconds() !== previousSeconds) for (const listener of [...listeners]) listener();
}

/** Reads the `Date` response header, ignoring a malformed or absent one. */
export function observeResponseDate(response: Pick<Response, "headers">, sentAt: number, receivedAt: number = Date.now()): void {
  const header = response.headers.get("date");
  if (!header) return;
  const parsed = Date.parse(header);
  if (Number.isNaN(parsed)) return;
  observeServerTime({ serverEpochMs: parsed, sentAt, receivedAt, granularityMs: 1000 });
}

/** Server time now, in epoch milliseconds. Falls back to the local clock until first sync. */
export function serverNow(): number {
  return Date.now() + (best?.offsetMs ?? 0);
}

export function serverClockOffsetMs(): number {
  return best?.offsetMs ?? 0;
}

/**
 * The offset rounded to whole seconds. This — not the raw offset — is what React subscribes to:
 * a countdown that re-armed its 1 s interval on every sub-second correction would tear, skipping
 * or repeating a displayed second on each poll.
 */
export function serverClockOffsetSeconds(): number {
  return Math.round(serverClockOffsetMs() / 1000);
}

/** Whether the offset is a real observation rather than the unsynced default of zero. */
export function isServerClockSynced(): boolean {
  return best !== undefined;
}

export function subscribeServerClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam: forgets every observation so one test's skew cannot leak into the next. */
export function resetServerClock(): void {
  best = undefined;
  for (const listener of [...listeners]) listener();
}
