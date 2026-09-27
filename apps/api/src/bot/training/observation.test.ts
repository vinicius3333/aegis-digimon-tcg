import { describe, expect, it } from "vitest";
import { GameState, PlayerState } from "@aegis/shared";
import { makeInstance } from "../../engine/testkit/harness.js";
import { selectionCards, trainingObservation } from "./observation.js";

describe("training information boundary", () => {
  it("is invariant to hidden identities and deck order, including own security", () => {
    const state = new GameState();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.hand.push(makeInstance("BT1-010", seat, false));
      player.deck.push(makeInstance("BT1-010", seat, false), makeInstance("BT1-011", seat, false));
      player.security.push(makeInstance("BT1-010", seat, false));
      state.players.push(player);
    }
    const before = trainingObservation(state, 0);
    state.players[1]!.hand[0]!.cardId = "BT1-011";
    for (const player of state.players) {
      player.deck.reverse();
      player.security[0]!.cardId = "BT1-011";
    }
    expect(trainingObservation(state, 0)).toEqual(before);
    expect(before.players[1]!.hand).toEqual([]);
    state.players[0]!.hand[0]!.cardId = "BT1-011";
    expect(trainingObservation(state, 0)).not.toEqual(before);
  });

  it("exposes temporary reveals only to the deciding player", () => {
    const state = new GameState();
    const request = {
      decisionId: "reveal",
      seat: 0 as const,
      kind: "selectCards" as const,
      promptText: "Search",
      options: { visibleCards: [{ instanceId: "revealed-1", cardId: "BT1-010" }] },
    };
    expect(selectionCards(trainingObservation(state, 0, request)).get("revealed-1")?.cardId).toBe("BT1-010");
    expect(() => trainingObservation(state, 1, request)).toThrow("another player's private decision");
  });
});
