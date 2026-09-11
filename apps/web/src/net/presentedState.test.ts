import { describe, expect, it } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState } from "@aegis/shared";
import {
  MAX_TRACKED_SNAPSHOTS,
  recordSnapshot,
  selectPresentedState,
  snapshotGameState,
  type StateSnapshot,
} from "./presentedState";

function boardAt(stateVersion: number, securityCount = 5): GameState {
  const state = new GameState();
  state.stateVersion = stateVersion;
  const you = new PlayerState();
  you.seat = 0;
  you.securityCount = securityCount;
  const opponent = new PlayerState();
  opponent.seat = 1;
  state.players = new ArraySchema<PlayerState>(you, opponent);
  return state;
}

describe("snapshotGameState", () => {
  it("copies the schema into plain objects the board can read", () => {
    const snapshot = snapshotGameState(boardAt(3, 4));

    expect(snapshot.stateVersion).toBe(3);
    expect(Array.isArray(snapshot.players)).toBe(true);
    expect(snapshot.players[0]?.securityCount).toBe(4);
    expect(Array.isArray(snapshot.players[0]?.battleArea)).toBe(true);
  });

  it("does not follow the live state once taken", () => {
    const live = boardAt(3, 4);
    const snapshot = snapshotGameState(live);

    live.players[0]!.securityCount = 2;

    expect(snapshot.players[0]?.securityCount).toBe(4);
  });
});

describe("recordSnapshot", () => {
  it("records one snapshot per revision", () => {
    const first = recordSnapshot([], boardAt(1));

    expect(first.map((snapshot) => snapshot.stateVersion)).toEqual([1]);
    expect(recordSnapshot(first, boardAt(2)).map((snapshot) => snapshot.stateVersion)).toEqual([1, 2]);
  });

  it("ignores a patch that did not close a batch", () => {
    // A mid-batch patch carries part of a batch nobody is presenting yet: it belongs to
    // the next close, which is the snapshot the revision will get.
    const live = boardAt(1, 5);
    const recorded = recordSnapshot([], live);
    live.players[0]!.securityCount = 4;

    expect(recordSnapshot(recorded, live)).toBe(recorded);
  });

  it("keeps the ring buffer bounded", () => {
    let snapshots: readonly StateSnapshot[] = [];
    for (let version = 1; version <= MAX_TRACKED_SNAPSHOTS + 5; version++) {
      snapshots = recordSnapshot(snapshots, boardAt(version));
    }

    expect(snapshots).toHaveLength(MAX_TRACKED_SNAPSHOTS);
    expect(snapshots.at(0)?.stateVersion).toBe(6);
    expect(snapshots.at(-1)?.stateVersion).toBe(MAX_TRACKED_SNAPSHOTS + 5);
  });

  it("has nothing to record without a state", () => {
    expect(recordSnapshot([], undefined)).toEqual([]);
  });
});

describe("selectPresentedState", () => {
  const live = boardAt(4, 2);
  const snapshots = [1, 2, 3, 4].map((version) => ({
    stateVersion: version,
    state: snapshotGameState(boardAt(version, 5 - version)),
  }));

  it("presents the board of the batch being presented", () => {
    const presented = selectPresentedState({ live, snapshots, presentedStateVersion: 2 });

    expect(presented?.stateVersion).toBe(2);
    expect(presented?.players[0]?.securityCount).toBe(3);
  });

  it("presents the live state while the queue is idle", () => {
    expect(selectPresentedState({ live, snapshots, presentedStateVersion: undefined })).toBe(live);
  });

  it("presents the live state for a revision at or past it (replay and drain report none)", () => {
    expect(selectPresentedState({ live, snapshots, presentedStateVersion: 4 })).toBe(live);
    expect(selectPresentedState({ live, snapshots, presentedStateVersion: 9 })).toBe(live);
  });

  it("presents the live state when the snapshot is gone", () => {
    expect(selectPresentedState({ live, snapshots: [], presentedStateVersion: 2 })).toBe(live);
    expect(selectPresentedState({ live, snapshots: snapshots.slice(2), presentedStateVersion: 1 })).toBe(live);
  });

  it("has nothing to present without a live state", () => {
    expect(selectPresentedState({ live: undefined, snapshots, presentedStateVersion: 2 })).toBeUndefined();
  });
});
