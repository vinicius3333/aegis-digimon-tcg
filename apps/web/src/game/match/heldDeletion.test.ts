import { describe, expect, it } from "vitest";
import type { GameState } from "@aegis/shared";
import { heldDeletionFrom } from "./heldDeletion";

function board(stateVersion: number, seat0: readonly string[], seat1: readonly string[]): GameState {
  const permanents = (ids: readonly string[]) => ids.map((permanentId) => ({ permanentId }));
  return {
    stateVersion,
    players: [
      { battleArea: permanents(seat0), trash: [{ instanceId: `t${stateVersion}` }] },
      { battleArea: permanents(seat1), trash: [] },
    ],
  } as unknown as GameState;
}

describe("heldDeletionFrom", () => {
  const snapshots = [
    { stateVersion: 1, state: board(1, ["a", "dead"], ["x"]) },
    { stateVersion: 2, state: board(2, ["dead", "a"], ["x"]) },
    { stateVersion: 3, state: board(3, ["a"], ["x"]) },
  ];

  it("takes the newest snapshot that still shows the permanent, with its slot and trash", () => {
    expect(heldDeletionFrom({ snapshots, seat: 0, permanentId: "dead" })).toMatchObject({
      seat: 0,
      index: 0,
      permanent: { permanentId: "dead" },
      trash: [{ instanceId: "t2" }],
    });
  });

  it("searches both seats when the event names none", () => {
    expect(heldDeletionFrom({ snapshots, seat: undefined, permanentId: "x" })).toMatchObject({ seat: 1, index: 0 });
  });

  it("finds nothing for a permanent no snapshot remembers", () => {
    expect(heldDeletionFrom({ snapshots, seat: 0, permanentId: "never" })).toBeUndefined();
    expect(heldDeletionFrom({ snapshots, seat: 1, permanentId: "dead" })).toBeUndefined();
  });
});
