import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat, type ServerEvent } from "@aegis/shared";
import { GameStateAccess } from "./access.js";

const CARD_ID = "AD1-001";

function makePermanent(permanentId: string, seat: Seat, inBreeding: boolean, cardId = CARD_ID): Permanent {
  const top = new CardInstance();
  top.instanceId = `${permanentId}-top`;
  top.cardId = cardId;
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

describe("GameStateAccess deletion narration", () => {
  it("identifies the deleted field card separately from its digivolution cards", () => {
    const state = makeState();
    const permanent = makePermanent("battle-1", 1, false);
    permanent.topCard.artId = "AD1-001_P1";
    const source = new CardInstance();
    source.instanceId = "source-1";
    source.cardId = "BT1-009";
    source.ownerSeat = 1;
    permanent.stack.push(source);
    state.players[1]!.battleArea.push(permanent);
    const events: ServerEvent[] = [];
    const access = new GameStateAccess(state, undefined, (event) => events.push(event));
    access.deletePermanent("battle-1");
    expect(events[0]).toMatchObject({
      deletedPermanents: [
        { permanentId: "battle-1", instanceId: "battle-1-top", cardId: CARD_ID, artId: "AD1-001_P1", seat: 1 },
      ],
    });
  });

  it("publishes the move to trash, so a combat death reaches the client like any other deletion", () => {
    const state = makeState();
    state.players[0]!.battleArea.push(makePermanent("battle-1", 0, false));
    const events: ServerEvent[] = [];
    const access = new GameStateAccess(state, undefined, (event) => events.push(event));

    access.deletePermanent("battle-1");

    expect(events).toMatchObject([
      { kind: "cardsMoved", instanceIds: ["battle-1-top"], from: "battleArea", to: "trash" },
    ]);
  });

  it("names the breeding area as the origin of a breeding deletion", () => {
    const state = makeState();
    state.players[1]!.breeding = makePermanent("breeding-1", 1, true);
    const events: ServerEvent[] = [];
    const access = new GameStateAccess(state, undefined, (event) => events.push(event));

    access.deletePermanent("breeding-1");

    expect(events).toMatchObject([
      { kind: "cardsMoved", instanceIds: ["breeding-1-top"], from: "breeding", to: "trash" },
    ]);
  });

  it("trashes a deleted Digi-Egg, because the Digi-Egg redirect covers private areas only", () => {
    const state = makeState();
    const existingEgg = new CardInstance();
    existingEgg.instanceId = "existing-egg";
    existingEgg.cardId = "BT1-001";
    existingEgg.ownerSeat = 0;
    existingEgg.faceUp = false;
    state.players[0]!.eggDeck.push(existingEgg);
    state.players[0]!.battleArea.push(makePermanent("egg-battle", 0, false, "EX2-007"));
    const events: ServerEvent[] = [];
    const access = new GameStateAccess(state, undefined, (event) => events.push(event));

    access.deletePermanent("egg-battle");

    // CR §3-1-3-9 redirects a Digi-Egg only when it would enter a private area; the trash
    // is public, so deletion (CR §4-15-1) trashes it like any other card.
    expect(state.players[0]!.battleArea).toHaveLength(0);
    expect(state.players[0]!.trash.map((card) => card.instanceId)).toEqual(["egg-battle-top"]);
    expect(state.players[0]!.eggDeck.map((card) => card.instanceId)).toEqual(["existing-egg"]);
    expect(events).toMatchObject([
      { kind: "cardsMoved", instanceIds: ["egg-battle-top"], from: "battleArea", to: "trash" },
    ]);
  });

  it("publishes one event per origin zone for a simultaneous batch", () => {
    const state = makeState();
    state.players[0]!.battleArea.push(makePermanent("battle-1", 0, false));
    state.players[1]!.battleArea.push(makePermanent("battle-2", 1, false));
    state.players[0]!.breeding = makePermanent("breeding-1", 0, true);
    const events: ServerEvent[] = [];
    const access = new GameStateAccess(state, undefined, (event) => events.push(event));

    access.deletePermanentsBatched(["battle-1", "breeding-1", "battle-2"]);

    expect(events).toMatchObject([
      { kind: "cardsMoved", instanceIds: ["battle-1-top", "battle-2-top"], from: "battleArea", to: "trash" },
      { kind: "cardsMoved", instanceIds: ["breeding-1-top"], from: "breeding", to: "trash" },
    ]);
    expect(events[0]).toMatchObject({
      deletedPermanents: [
        { permanentId: "battle-1", instanceId: "battle-1-top", cardId: CARD_ID, seat: 0 },
        { permanentId: "battle-2", instanceId: "battle-2-top", cardId: CARD_ID, seat: 1 },
      ],
    });
    expect(events[1]).toMatchObject({
      deletedPermanents: [{ permanentId: "breeding-1", instanceId: "breeding-1-top", cardId: CARD_ID, seat: 0 }],
    });
  });

  it("publishes nothing when the permanent is already off the field", () => {
    const state = makeState();
    const events: ServerEvent[] = [];
    const access = new GameStateAccess(state, undefined, (event) => events.push(event));

    access.deletePermanent("no-such-id");

    expect(events).toEqual([]);
  });
});
