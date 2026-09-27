import { describe, expect, it } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, type Seat, type ServerEvent } from "@aegis/shared";
import { snapshotGameState } from "../../../net/presentedState";
import { releaseHandMoves } from "./usePhaseBanners";

function concealedState(seat: Seat): GameState {
  const state = new GameState();
  state.players = new ArraySchema(new PlayerState(), new PlayerState());
  state.players[seat]!.handCount = 5;
  state.players[seat]!.deckCount = 40;
  const snapshot = snapshotGameState(state);
  // StateView omits the opponent's private collection on the wire.
  Reflect.deleteProperty(snapshot.players[seat]!, "hand");
  return snapshot;
}

describe("releaseHandMoves with a concealed hand", () => {
  it.each([0, 1] as const)("updates public counts without reading seat %s's hidden cards", (seat) => {
    const held = concealedState(seat);
    const live = concealedState(seat);
    live.players[seat]!.handCount = 6;
    live.players[seat]!.deckCount = 39;
    const moves: ServerEvent[] = [
      { kind: "cardsMoved", seat, from: "deck", to: "hand", instanceIds: ["hidden-draw"] },
    ];

    const released = releaseHandMoves({ held, live, moves });

    expect(released.players[seat]!.handCount).toBe(6);
    expect(released.players[seat]!.deckCount).toBe(39);
    expect(released.players[seat]!.hand).toEqual([]);
    expect(held.players[seat]!.handCount).toBe(5);
    expect(held.players[seat]!.deckCount).toBe(40);
    expect(held.players[seat]!.hand).toBeUndefined();
    expect(live.players[seat]!.hand).toBeUndefined();
  });
});
