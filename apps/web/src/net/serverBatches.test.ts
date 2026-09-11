import { describe, expect, it, vi } from "vitest";
import type { SequencedServerEvent } from "@aegis/shared";
import {
  batchesAfter,
  emptyBatchInbox,
  MAX_TRACKED_BATCHES,
  receiveServerEvent,
  singleServerBatch,
  type BatchInbox,
} from "./serverBatches";

function shuffled(seq: number, batch: string): SequencedServerEvent {
  return { kind: "deckShuffled", seat: 0, deck: "deck", seq, batch, stateVersion: 0 };
}

function closed(seq: number, batch: string, lastSeq: number, stateVersion = 1): SequencedServerEvent {
  return { kind: "batchClosed", batch, lastSeq, stateVersion, seq };
}

function receiveAll(events: readonly SequencedServerEvent[]): BatchInbox {
  return events.reduce(receiveServerEvent, emptyBatchInbox);
}

describe("server batch inbox", () => {
  it("appends a batch only once its close arrives", () => {
    const open = receiveAll([shuffled(1, "b1"), shuffled(2, "b1")]);
    expect(open.batches).toEqual([]);

    const inbox = receiveServerEvent(open, closed(3, "b1", 2, 4));
    expect(inbox.batches).toEqual([{ id: "b1", stateVersion: 4, events: [shuffled(1, "b1"), shuffled(2, "b1")] }]);
    expect(inbox.open.size).toBe(0);
  });

  // A batch's close waits for the state patch, so the next batch's events overtake it.
  it("keeps several batches open at once and closes the one named", () => {
    const inbox = receiveAll([
      shuffled(1, "b1"),
      shuffled(3, "b2"),
      closed(2, "b1", 1),
      shuffled(5, "b3"),
      closed(4, "b2", 3),
    ]);

    expect(inbox.batches.map((batch) => batch.id)).toEqual(["b1", "b2"]);
    expect(inbox.batches[1]!.events.map((event) => event.seq)).toEqual([3]);
    expect([...inbox.open.keys()]).toEqual(["b3"]);
  });

  it("warns about a gap inside a batch and keeps what it has", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const inbox = receiveAll([shuffled(1, "b1"), shuffled(3, "b1"), closed(4, "b1", 3)]);
      expect(warn).toHaveBeenCalled();
      expect(inbox.batches[0]!.events.map((event) => event.seq)).toEqual([1, 3]);
    } finally {
      warn.mockRestore();
    }
  });

  it("says nothing about the jump a unicast rejection leaves between batches", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      receiveAll([shuffled(1, "b1"), closed(2, "b1", 1), shuffled(9, "b4"), closed(10, "b4", 9)]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("keeps memory bounded to the most recent batches", () => {
    let inbox = emptyBatchInbox;
    for (let index = 0; index < MAX_TRACKED_BATCHES + 10; index += 1) {
      const batch = `b${index}`;
      inbox = receiveServerEvent(inbox, shuffled(index * 2 + 1, batch));
      inbox = receiveServerEvent(inbox, closed(index * 2 + 2, batch, index * 2 + 1));
    }

    expect(inbox.batches).toHaveLength(MAX_TRACKED_BATCHES);
    expect(inbox.batches.at(-1)!.id).toBe(`b${MAX_TRACKED_BATCHES + 9}`);
  });
});

describe("batchesAfter", () => {
  const one = singleServerBatch([{ kind: "deckShuffled", seat: 0, deck: "deck" }]);
  const two = singleServerBatch([{ kind: "deckShuffled", seat: 1, deck: "deck" }]);

  it("returns everything when nothing has been consumed", () => {
    expect(batchesAfter([one, two], undefined)).toEqual([one, two]);
  });

  it("returns what follows the batch already consumed", () => {
    expect(batchesAfter([one, two], one.id)).toEqual([two]);
    expect(batchesAfter([one, two], two.id)).toEqual([]);
  });

  // The window is bounded, so the batch a slow consumer last saw may be gone.
  it("returns everything still known when the consumed batch has been dropped", () => {
    expect(batchesAfter([one, two], "dropped")).toEqual([one, two]);
  });
});

describe("singleServerBatch", () => {
  it("stamps a fabricated event list as one batch", () => {
    const batch = singleServerBatch([
      { kind: "deckShuffled", seat: 0, deck: "deck" },
      { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 2 },
    ]);

    expect(batch.events.map((event) => event.seq)).toEqual([1, 2]);
    expect(new Set(batch.events.map((event) => event.batch))).toEqual(new Set([batch.id]));
  });

  it("gives each fabricated list a batch id of its own", () => {
    const first = singleServerBatch([{ kind: "deckShuffled", seat: 0, deck: "deck" }]);
    const second = singleServerBatch([{ kind: "deckShuffled", seat: 0, deck: "deck" }]);

    expect(first.id).not.toBe(second.id);
  });
});
