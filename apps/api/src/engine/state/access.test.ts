import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat } from "@aegis/shared";
import { GameStateAccess } from "./access.js";

const CARD_ID = "AD1-001";

function makePermanent(permanentId: string, seat: Seat, inBreeding: boolean): Permanent {
  const top = new CardInstance();
  top.instanceId = `${permanentId}-top`;
  top.cardId = CARD_ID;
  top.ownerSeat = seat;
  top.faceUp = true;

  const permanent = new Permanent();
  permanent.permanentId = permanentId;
  permanent.controllerSeat = seat;
  permanent.topCard = top;
  permanent.inBreeding = inBreeding;
  return permanent;
}

function makeState(): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return state;
}

describe("GameStateAccess.permanentById", () => {
  it("finds a battle-area permanent (existing behavior)", () => {
    const state = makeState();
    const battlePermanent = makePermanent("battle-1", 0, false);
    state.players[0]!.battleArea.push(battlePermanent);
    const access = new GameStateAccess(state);

    expect(access.permanentById("battle-1")).toBe(battlePermanent);
  });

  it("finds a breeding-slot permanent (the S1 correctness fix)", () => {
    const state = makeState();
    const breedingPermanent = makePermanent("breeding-1", 1, true);
    state.players[1]!.breeding = breedingPermanent;
    const access = new GameStateAccess(state);

    // Prior to the fix this scanned only battleArea and silently returned
    // undefined for a permanent that exists in the breeding slot.
    expect(access.permanentById("breeding-1")).toBe(breedingPermanent);
  });

  it("returns undefined for an id that exists nowhere", () => {
    const state = makeState();
    const access = new GameStateAccess(state);

    expect(access.permanentById("no-such-id")).toBeUndefined();
  });
});
