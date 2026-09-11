/* The client side of the sequenced event stream (docs/presentation-queue-plan.md 3.1).

   The server groups everything one entry into the engine produced into a batch and ends
   it with `batchClosed`. Grouping the presentation by that batch is what replaces "the
   events that arrived since the last React render", which made the boundary the patch
   tick and React's scheduling rather than the rules. */

import type { SequencedServerEvent, ServerEvent } from "@aegis/shared";

/** One closed server batch: everything the rules resolved together, in emission order. */
export interface ServerBatch {
  id: string;
  stateVersion: number;
  events: readonly SequencedServerEvent[];
}

/**
 * How many closed batches are kept. The presentation only ever consumes the batches it has
 * not played yet; the rest are history a slow client no longer needs.
 */
export const MAX_TRACKED_BATCHES = 50;

/**
 * The events of every batch the server has not closed yet, keyed by batch, plus the batches
 * it has closed.
 *
 * Several batches are open at once in the ordinary case: the events of a batch travel the
 * moment they are emitted, while its close waits for the state patch, so the next batch's
 * events overtake the previous batch's close.
 */
export interface BatchInbox {
  open: ReadonlyMap<string, readonly SequencedServerEvent[]>;
  batches: readonly ServerBatch[];
}

export const emptyBatchInbox: BatchInbox = { open: new Map(), batches: [] };

/**
 * File one arriving event.
 *
 * A gap is reported and nothing else: the board is rebuilt from synchronized state, so a
 * lost presentation event costs narration, never correctness. Only a gap INSIDE a batch is
 * a lost message — a jump between batches is ordinary, because `actionRejected` is sent to
 * one client and spends a number the other client never sees.
 */
export function receiveServerEvent(inbox: BatchInbox, event: SequencedServerEvent): BatchInbox {
  const collected = inbox.open.get(event.batch) ?? [];
  const previous = collected.at(-1);
  if (previous && event.seq !== previous.seq + 1) {
    console.warn("[EVENT_STREAM] gap inside a batch", { batch: event.batch, after: previous.seq, got: event.seq });
  }
  const open = new Map(inbox.open);
  if (event.kind !== "batchClosed") {
    open.set(event.batch, [...collected, event]);
    // A close lost while the socket was down would otherwise keep its events for the rest
    // of the match. Only a handful of batches are ever open at once.
    for (const batch of [...open.keys()].slice(0, open.size - MAX_TRACKED_BATCHES)) open.delete(batch);
    return { ...inbox, open };
  }
  open.delete(event.batch);
  // A close whose events never arrived carries nothing to present.
  if (collected.length === 0) return { ...inbox, open };
  if (collected.at(-1)!.seq !== event.lastSeq) {
    console.warn("[EVENT_STREAM] batch closed short", {
      batch: event.batch,
      lastSeq: event.lastSeq,
      got: collected.at(-1)!.seq,
    });
  }
  return {
    open,
    batches: [
      ...inbox.batches.slice(-(MAX_TRACKED_BATCHES - 1)),
      { id: event.batch, stateVersion: event.stateVersion, events: collected },
    ],
  };
}

/**
 * The batches appended after `previousId`, resilient to the bounded window above: a caller
 * whose last batch has already been dropped is given everything still known, exactly as the
 * event-log equivalent (`eventsAfter`) does.
 */
export function batchesAfter(batches: readonly ServerBatch[], previousId: string | undefined): readonly ServerBatch[] {
  if (previousId === undefined) return batches;
  const index = batches.findIndex((batch) => batch.id === previousId);
  return index < 0 ? batches : batches.slice(index + 1);
}

let fabricatedBatches = 0;

/**
 * Wrap a plain event list as one batch, for the paths that fabricate events instead of
 * receiving them from a room: the effects showcase, the board demos and the hook tests.
 */
export function singleServerBatch(events: readonly ServerEvent[], stateVersion = 0): ServerBatch {
  fabricatedBatches += 1;
  const id = `fabricated-${fabricatedBatches}`;
  return {
    id,
    stateVersion,
    events: events.map((event, index) => ({ ...event, seq: index + 1, batch: id, stateVersion })),
  };
}
