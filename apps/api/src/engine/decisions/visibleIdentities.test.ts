import { describe, expect, it } from "vitest";
import { CardInstance, GameState, PlayerState, type Seat } from "@aegis/shared";
import { decisionCardIdentities, zoneOfInstance } from "./visibleIdentities.js";

function card(instanceId: string, cardId: string, faceUp = false): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  instance.faceUp = faceUp;
  return instance;
}

/** Two seats, each with the four redacted zones the client cannot read out of its own state. */
function board(): GameState {
  const state = new GameState();
  state.players.push(new PlayerState(), new PlayerState());
  state.players.forEach((player, index) => {
    player.seat = index as Seat;
  });
  return state;
}

describe("identities a decision has to carry", () => {
  it("names a seat's own deck cards to that seat", () => {
    const state = board();
    state.players[0]!.deck.push(card("deck-1", "BT1-010"));
    expect(decisionCardIdentities(state, 0, ["deck-1"])).toEqual([{ instanceId: "deck-1", cardId: "BT1-010" }]);
  });

  it("names a seat's own egg deck the same way", () => {
    const state = board();
    state.players[1]!.eggDeck.push(card("egg-1", "BT1-001"));
    expect(decisionCardIdentities(state, 1, ["egg-1"])).toEqual([{ instanceId: "egg-1", cardId: "BT1-001" }]);
  });

  // A revealed card is one the effect has already shown; the seat looking at it is not
  // necessarily its owner (an opponent's deck top can be revealed and chosen from).
  it("names a face-up card to whichever seat is deciding", () => {
    const state = board();
    state.players[1]!.deck.push(card("revealed", "BT1-011", true));
    expect(decisionCardIdentities(state, 0, ["revealed"])).toEqual([{ instanceId: "revealed", cardId: "BT1-011" }]);
  });

  // The blind pick the engine models with real instance ids. Naming these would hand the
  // chooser the whole stack — Comprehensive Rules §3-4-3 withholds it from its owner too.
  it("never names a face-down security card, to either seat", () => {
    const state = board();
    state.players[1]!.security.push(card("sec-1", "BT1-012"));
    expect(decisionCardIdentities(state, 0, ["sec-1"])).toEqual([]);
    expect(decisionCardIdentities(state, 1, ["sec-1"])).toEqual([]);
  });

  it("names a security card once it has been turned face up", () => {
    const state = board();
    state.players[1]!.security.push(card("sec-1", "BT1-012", true));
    expect(decisionCardIdentities(state, 0, ["sec-1"])).toEqual([{ instanceId: "sec-1", cardId: "BT1-012" }]);
  });

  it("never names another seat's face-down hand", () => {
    const state = board();
    state.players[1]!.hand.push(card("hand-1", "BT1-013"));
    expect(decisionCardIdentities(state, 0, ["hand-1"])).toEqual([]);
  });

  it("never names another seat's deck while it is face down", () => {
    const state = board();
    state.players[1]!.deck.push(card("deck-1", "BT1-013"));
    expect(decisionCardIdentities(state, 0, ["deck-1"])).toEqual([]);
  });

  // `mine` / `opponent` / `player` are the sentinels a seatless choice uses; they name no card.
  it("ignores an id no card answers to", () => {
    expect(decisionCardIdentities(board(), 0, ["mine", "opponent", "player"])).toEqual([]);
  });

  it("reports the zone an offered instance sits in", () => {
    const state = board();
    state.players[0]!.deck.push(card("deck-1", "BT1-010"));
    expect(zoneOfInstance(state, "deck-1")).toBe("deck:seat0");
    expect(zoneOfInstance(state, "nothing")).toBeUndefined();
  });
});
