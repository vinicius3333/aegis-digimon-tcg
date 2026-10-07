import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import { expect, it } from "vitest";
import { instanceCardId } from "./decisionModel";

it("looks up a permanent's card when the opponent's private hand is not synced", () => {
  const state = new GameState();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players.push(player);
  }
  const host = new Permanent();
  host.permanentId = "host";
  host.topCard = new CardInstance();
  host.topCard.instanceId = "host-top";
  host.topCard.cardId = "BT1-010";
  state.players[1]!.battleArea.push(host);
  // The client never receives the other seat's hand: the schema field is a private view.
  (state.players[0] as unknown as { hand: undefined }).hand = undefined;

  expect(instanceCardId(state, "host-top")).toBe("BT1-010");
  expect(instanceCardId(state, "host")).toBeUndefined();
});
