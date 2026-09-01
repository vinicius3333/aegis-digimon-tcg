import { Decoder, Encoder } from "@colyseus/schema";
import { CardInstance, GameState, Permanent, PlayerState, Zone, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { insertCard, linkCard, placePermanent, replaceStack, unshiftOnStack } from "./access.js";

/**
 * Every insertion into synchronized state must survive the encoder, in order.
 *
 * The bug these guard: @colyseus/schema 3.0.76's `ArraySchema#unshift` shifts the change
 * indexes but never calls `setParent` on the items it inserts, so a client decoded an
 * identity-less placeholder — a card with no instanceId and no cardId — where the inserted
 * card should be, and the entries around it came out reordered or missing. It hit every
 * front-insertion the game performs: bottom digivolution cards (BT11-111 / BT21-062
 * Galacticmon placing 4 [Vemmon] under itself), ＜Link＞ cards, and anything returned to the
 * top of security or the deck. Four such inserts in one patch left the client showing a stack
 * of blank look-alike slots, and a later removal from that array then deleted the wrong
 * entries.
 *
 * These assert the SERVER-to-CLIENT contract (decoded state equals engine state), not the
 * engine array alone — a plain `expect(stack.map(...))` passes against the broken encoding.
 * They decode the unfiltered stream, so `cardId` (a @view-tagged field) is absent here by
 * design; what a seat's StateView carries is covered by `digivolutionStackSync.test.ts`.
 */

let seq = 0;
function card(cardId = "BT11-061", seat: Seat = 0): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = `card-${(seq += 1)}`;
  instance.cardId = cardId;
  instance.ownerSeat = seat;
  instance.faceUp = true;
  return instance;
}

function twoSeatState(): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return state;
}

/** An encoder plus a decoded mirror of it — the client's copy of the same state. */
function mirror(state: GameState) {
  const encoder = new Encoder(state);
  const client = new Decoder(new GameState());
  const snapshot = (): void => {
    client.decode(encoder.encodeAll({ offset: 0 }));
    encoder.discardChanges();
  };
  const patch = (): void => {
    client.decode(encoder.encode({ offset: 0 }));
    encoder.discardChanges();
  };
  snapshot();
  return { client, patch };
}

const ids = (cards: readonly { instanceId: string }[]): string[] => cards.map((c) => c.instanceId);
/** Undefined for an entry the client decoded without an identity — the blank-card symptom. */
const decodedIds = (cards: readonly (CardInstance | undefined)[]): (string | undefined)[] =>
  [...cards].map((c) => c?.instanceId);

describe("inserting into synchronized arrays", () => {
  it("puts a bottom digivolution card at the bottom for the client too", () => {
    const state = twoSeatState();
    const permanent = new Permanent();
    permanent.permanentId = "perm-1";
    permanent.controllerSeat = 0;
    permanent.topCard = card("BT11-111");
    permanent.stack.push(card("BT11-065"));
    placePermanent(state.players[0]!, permanent);
    const { client, patch } = mirror(state);

    // Galacticmon's [When Digivolving]: 4 [Vemmon] placed as its BOTTOM digivolution cards.
    for (let i = 0; i < 4; i += 1) unshiftOnStack(permanent, card());
    patch();

    const clientPermanent = (client.state as GameState).players[0]!.battleArea[0]!;
    expect(decodedIds(clientPermanent.stack)).toEqual(ids(permanent.stack));
  });

  it("keeps the stack in step after the placed cards are taken away again", () => {
    const state = twoSeatState();
    const permanent = new Permanent();
    permanent.permanentId = "perm-1";
    permanent.controllerSeat = 0;
    permanent.topCard = card("BT11-111");
    permanent.stack.push(card("BT11-065"));
    placePermanent(state.players[0]!, permanent);
    const { client, patch } = mirror(state);

    for (let i = 0; i < 4; i += 1) unshiftOnStack(permanent, card());
    patch();
    // The leave-prevention cost returns those 4 [Vemmon] to the bottom of the deck.
    for (let i = 0; i < 4; i += 1) permanent.stack.splice(0, 1);
    patch();

    const clientPermanent = (client.state as GameState).players[0]!.battleArea[0]!;
    expect(decodedIds(clientPermanent.stack)).toEqual(ids(permanent.stack));
  });

  it("puts a linked card at the front for the client too", () => {
    const state = twoSeatState();
    const permanent = new Permanent();
    permanent.permanentId = "perm-1";
    permanent.controllerSeat = 0;
    permanent.topCard = card("BT11-111");
    placePermanent(state.players[0]!, permanent);
    linkCard(permanent, card("BT11-061"), "bottom");
    const { client, patch } = mirror(state);

    linkCard(permanent, card("BT11-065"));
    patch();

    const clientPermanent = (client.state as GameState).players[0]!.battleArea[0]!;
    expect(decodedIds(clientPermanent.linked)).toEqual(ids(permanent.linked));
  });

  it("puts a card returned to the top of a loose zone on top for the client too", () => {
    const state = twoSeatState();
    const player = state.players[0]!;
    player.trash.push(card("BT1-001"));
    player.trash.push(card("BT1-002"));
    const { client, patch } = mirror(state);

    insertCard(player, Zone.Trash, card("BT1-003"), "top");
    patch();

    expect(decodedIds((client.state as GameState).players[0]!.trash)).toEqual(ids(player.trash));
  });

  it("replaces a stack with a longer one", () => {
    const state = twoSeatState();
    const permanent = new Permanent();
    permanent.permanentId = "perm-1";
    permanent.controllerSeat = 0;
    permanent.topCard = card("BT11-111");
    permanent.stack.push(card("BT11-065"));
    placePermanent(state.players[0]!, permanent);
    const { client, patch } = mirror(state);

    // A growing `splice(0, length, ...cards)` throws outright ("insertCount must be equal or
    // lower than deleteCount"), so this replacement has to be a clear-and-append.
    replaceStack(permanent, [card(), card(), card()]);
    patch();

    const clientPermanent = (client.state as GameState).players[0]!.battleArea[0]!;
    expect(permanent.stack).toHaveLength(3);
    expect(decodedIds(clientPermanent.stack)).toEqual(ids(permanent.stack));
  });
});
