import { describe, expect, it } from "vitest";
import { GameState, PlayerState, Permanent } from "@aegis/shared";
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

  it("copies public live statuses without reading a hidden stacked identity", () => {
    const state = new GameState();
    const opponent = new PlayerState();
    opponent.seat = 1;
    state.players.push(opponent);
    const permanent = new Permanent();
    permanent.permanentId = "opponent";
    permanent.controllerSeat = 1;
    permanent.topCard = makeInstance("ST23-09", 1, true);
    permanent.stack.push(makeInstance("BT25-032", 1, false));
    permanent.currentDP = 16000;
    permanent.securityAttack = 3;
    permanent.immuneToOpponentDigimonEffects = true;
    permanent.cannotUnsuspend = true;
    permanent.keywords.push("Blocker", "Reboot");
    opponent.battleArea.push(permanent);
    const observation = trainingObservation(state, 0);
    expect(observation.players[0]!.board[0]).toMatchObject({
      dp: 16000,
      securityAttack: 3,
      keywords: ["Blocker", "Reboot"],
      statuses: { immuneToOpponentDigimonEffects: true, cannotUnsuspend: true },
    });
    permanent.stack[0]!.cardId = "BT25-035";
    expect(trainingObservation(state, 0)).toEqual(observation);
    const withReveal = trainingObservation(state, 0, {
      decisionId: "board-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose",
      options: {
        visibleCards: [
          { instanceId: permanent.topCard.instanceId, cardId: "ST23-09" },
          { instanceId: permanent.stack[0]!.instanceId, cardId: "BT25-035" },
        ],
      },
    });
    expect(selectionCards(withReveal).get(permanent.topCard.instanceId)?.dp).toBe(16000);
    expect(selectionCards(withReveal).get(permanent.stack[0]!.instanceId)?.cardId).toBe("BT25-035");
    permanent.immuneToOpponentDigimonEffects = false;
    expect(trainingObservation(state, 0)).not.toEqual(observation);
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
