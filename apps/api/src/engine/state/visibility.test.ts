import { describe, it, expect, beforeEach } from "vitest";
import { $changes, ArraySchema, Decoder, Encoder, type StateView } from "@colyseus/schema";
import {
  GameState,
  PlayerState,
  CardInstance,
  Permanent,
  PRIVATE_VIEW_TAG,
  PRIVATE_DECISION_VIEW_TAG,
  PendingDecision,
  type Seat,
} from "@aegis/shared";
import {
  buildStateView,
  refreshStateView,
  syncPublicCounts,
  revealSecurityCardToOpponent,
  privateZoneSnapshot,
} from "./visibility.js";
import { extractCardAt, insertCard } from "./access.js";
import { Zone } from "@aegis/shared";

function makeCard(id: string, ownerSeat: Seat, faceUp = true): CardInstance {
  const card = new CardInstance();
  card.instanceId = id;
  card.cardId = "TEST-001";
  card.ownerSeat = ownerSeat;
  card.faceUp = faceUp;
  return card;
}

function fill(zone: ArraySchema<CardInstance>, prefix: string, ownerSeat: Seat, n: number): void {
  for (let i = 0; i < n; i += 1) zone.push(makeCard(`${prefix}-${i}`, ownerSeat));
}

const encoderByState = new WeakMap<GameState, Encoder<GameState>>();

/**
 * Build a two-seat GameState with populated private zones and attach it to an
 * Encoder. The Encoder assigns the root/refIds the StateView machinery needs;
 * without it StateView.add() rejects "detached" instances.
 */
function makeState(): GameState {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.deck = new ArraySchema<CardInstance>();
    player.eggDeck = new ArraySchema<CardInstance>();
    player.hand = new ArraySchema<CardInstance>();
    player.security = new ArraySchema<CardInstance>();
    fill(player.deck, `s${seat}-deck`, seat, 37);
    fill(player.eggDeck, `s${seat}-egg`, seat, 4);
    fill(player.hand, `s${seat}-hand`, seat, 5);
    // Security stored face-down (the default state of a fresh security stack).
    for (let i = 0; i < 5; i += 1) player.security.push(makeCard(`s${seat}-sec-${i}`, seat, false));
    state.players[seat] = player;
  }
  // eslint-disable-next-line no-new -- constructing the Encoder wires the state root.
  const encoder = new Encoder(state);
  encoderByState.set(state, encoder);
  return state;
}

function encodeAllForView(state: GameState, view: StateView, decoder: Decoder<GameState>): void {
  const encoder = encoderByState.get(state)!;
  const iterator = { offset: 0 };
  encoder.encodeAll(iterator);
  decoder.decode(encoder.encodeAllView(view, iterator.offset, iterator));
  encoder.discardChanges();
}

function encodePatchForView(state: GameState, view: StateView, decoder: Decoder<GameState>): void {
  const encoder = encoderByState.get(state)!;
  const iterator = { offset: 0 };
  encoder.encode(iterator);
  decoder.decode(encoder.encodeView(view, iterator.offset, iterator));
  encoder.discardChanges();
}

describe("syncPublicCounts", () => {
  it("mirrors each private zone's length into its public count field", () => {
    const state = makeState();
    // Counts start at their schema defaults (0) before a sync.
    expect(state.players[0]!.handCount).toBe(0);

    syncPublicCounts(state);

    for (const seat of [0, 1] as const) {
      const p = state.players[seat]!;
      expect(p.deckCount).toBe(37);
      expect(p.eggDeckCount).toBe(4);
      expect(p.handCount).toBe(5);
      expect(p.securityCount).toBe(5);
    }
  });

  it("tracks subsequent zone changes on a re-sync", () => {
    const state = makeState();
    syncPublicCounts(state);
    state.players[0]!.hand.pop();
    state.players[0]!.deck.pop();

    syncPublicCounts(state);

    expect(state.players[0]!.handCount).toBe(4);
    expect(state.players[0]!.deckCount).toBe(36);
  });

  it("does not move any card between zones", () => {
    const state = makeState();
    const before = privateZoneSnapshot(state.players[0]!).map((z) => z.map((c) => c.instanceId));
    syncPublicCounts(state);
    const after = privateZoneSnapshot(state.players[0]!).map((z) => z.map((c) => c.instanceId));
    expect(after).toEqual(before);
  });
});

describe("buildStateView", () => {
  let state: GameState;
  beforeEach(() => {
    state = makeState();
  });

  it("unlocks the viewer's own PlayerState with the private tag", () => {
    const view = buildStateView(state, 0);
    const own = state.players[0]!;
    expect(view.has(own)).toBe(true);
    expect(view.hasTag(own, PRIVATE_VIEW_TAG)).toBe(true);
  });

  it("makes the viewer's own private zones visible", () => {
    const view = buildStateView(state, 0);
    const own = state.players[0]!;
    expect(view.has(own.deck)).toBe(true);
    expect(view.has(own.eggDeck)).toBe(true);
    expect(view.has(own.hand)).toBe(true);
    expect(view.has(own.security)).toBe(true);
  });

  it("does NOT unlock the opponent's PlayerState private zones", () => {
    const view = buildStateView(state, 0);
    const opponent = state.players[1]!;
    expect(view.has(opponent)).toBe(false);
    expect(view.has(opponent.hand)).toBe(false);
    expect(view.has(opponent.deck)).toBe(false);
    expect(view.has(opponent.security)).toBe(false);
  });

  it("gives each seat a mirror-image view", () => {
    const view0 = buildStateView(state, 0);
    const view1 = buildStateView(state, 1);
    expect(view0.has(state.players[0]!.hand)).toBe(true);
    expect(view0.has(state.players[1]!.hand)).toBe(false);
    expect(view1.has(state.players[1]!.hand)).toBe(true);
    expect(view1.has(state.players[0]!.hand)).toBe(false);
  });

  it("unlocks private decision payloads only for the responding seat", () => {
    const decision = new PendingDecision();
    decision.decisionId = "private-search";
    decision.seat = 0;
    decision.kind = "selectCards";
    decision.promptText = "Choose a card";
    decision.payloadJson = JSON.stringify({ visibleCards: [{ instanceId: "secret", cardId: "SECRET-001" }] });
    state.pendingDecision = decision;

    const respondingView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);

    expect(respondingView.hasTag(decision, PRIVATE_DECISION_VIEW_TAG)).toBe(true);
    expect(opponentView.hasTag(decision, PRIVATE_DECISION_VIEW_TAG)).toBe(false);
    expect(opponentView.has(decision)).toBe(false);

    const respondingDecoder = new Decoder(new GameState());
    encodeAllForView(state, respondingView, respondingDecoder);
    expect(respondingDecoder.state.pendingDecision).toMatchObject({
      decisionId: "private-search",
      seat: 0,
      kind: "selectCards",
      payloadJson: expect.stringContaining("SECRET-001"),
    });

    const opponentDecoder = new Decoder(new GameState());
    encodeAllForView(state, opponentView, opponentDecoder);
    expect(opponentDecoder.state.pendingDecision).toMatchObject({
      decisionId: "private-search",
      seat: 0,
      kind: "selectCards",
      payloadJson: "",
    });
  });

  it("reveals an opponent security card that is already face-up", () => {
    // Flip seat 1's top security card face-up before building seat 0's view.
    const flipped = state.players[1]!.security[0]!;
    flipped.faceUp = true;

    const view = buildStateView(state, 0);
    expect(view.has(flipped)).toBe(true);
    // The still-face-down ones remain hidden from the opponent.
    const faceDown = state.players[1]!.security[1]!;
    expect(view.has(faceDown)).toBe(false);
  });

  it("keeps all opponent security hidden when every card is face-down", () => {
    const view = buildStateView(state, 0);
    for (const card of state.players[1]!.security) {
      expect(view.has(card)).toBe(false);
    }
  });

  it("reveals an opponent card that moved from hand into a battle-area permanent", () => {
    // A card keeps a stale `isFiltered` flag after leaving the @view-tagged hand,
    // so without explicit re-exposure the opponent decodes topCard=undefined.
    const opponent = state.players[1]!;
    const card = opponent.hand.pop()!;
    const permanent = new Permanent();
    permanent.permanentId = "perm-test";
    permanent.controllerSeat = 1;
    permanent.topCard = card;
    opponent.battleArea = new ArraySchema<Permanent>();
    opponent.battleArea.push(permanent);

    const view = buildStateView(state, 0);
    expect(view.has(card)).toBe(true);
  });

  it("reveals opponent digivolution-stack and linked cards on a permanent", () => {
    const opponent = state.players[1]!;
    const top = opponent.hand.pop()!;
    const stackCard = opponent.hand.pop()!;
    const linkedCard = opponent.hand.pop()!;
    const permanent = new Permanent();
    permanent.permanentId = "perm-stacked";
    permanent.controllerSeat = 1;
    permanent.topCard = top;
    permanent.stack = new ArraySchema<CardInstance>(stackCard);
    permanent.linked = new ArraySchema<CardInstance>(linkedCard);
    opponent.battleArea = new ArraySchema<Permanent>();
    opponent.battleArea.push(permanent);

    const view = buildStateView(state, 0);
    expect(view.has(top)).toBe(true);
    expect(view.has(stackCard)).toBe(true);
    expect(view.has(linkedCard)).toBe(true);
  });

  it("refreshes after a card moves between schema zones", () => {
    const view = buildStateView(state, 0);
    const player = state.players[0]!;
    const moved = extractCardAt(player, Zone.Hand, 0)!;
    insertCard(player, Zone.Trash, moved);

    expect(() => refreshStateView(view, state, 0)).not.toThrow();
  });

  it("repairs a detached nested card schema before refreshing the view", () => {
    const view = buildStateView(state, 0);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, view, decoder);
    const player = state.players[0]!;
    const card = extractCardAt(player, Zone.Hand, 0)!;
    insertCard(player, Zone.Trash, card);
    const nested = card.digivolveTargetPermanentIds;
    nested.push("perm-a");
    while (nested[$changes].root !== undefined) {
      nested[$changes].root.remove(nested[$changes]);
    }
    nested[$changes].removeParent(card);
    expect(nested[$changes].root).toBeUndefined();
    expect(nested[$changes].parent).toBeUndefined();

    expect(() => refreshStateView(view, state, 0)).not.toThrow();
    expect(card.digivolveTargetPermanentIds).not.toBe(nested);
    expect(Array.from(card.digivolveTargetPermanentIds)).toEqual(["perm-a"]);
    expect(card.digivolveTargetPermanentIds[$changes].root).toBeDefined();

    encodePatchForView(state, view, decoder);
    const clientPlayer = decoder.state.players[0]!;
    expect(clientPlayer.hand.some(({ instanceId }) => instanceId === card.instanceId)).toBe(false);
    const clientCard = clientPlayer.trash.find(({ instanceId }) => instanceId === card.instanceId);
    expect(clientCard).toBeDefined();
    expect(Array.from(clientCard!.digivolveTargetPermanentIds)).toEqual(["perm-a"]);
  });
});

describe("revealSecurityCardToOpponent", () => {
  it("exposes a single security card to a view that otherwise hides it", () => {
    const state = makeState();
    const view = buildStateView(state, 0);
    const card = state.players[1]!.security[2]!;
    expect(view.has(card)).toBe(false);

    card.faceUp = true;
    revealSecurityCardToOpponent(view, card);

    expect(view.has(card)).toBe(true);
  });
});
