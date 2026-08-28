import { describe, it, expect, beforeEach } from "vitest";
import { $changes, ArraySchema, Decoder, Encoder, type StateView } from "@colyseus/schema";
import {
  GameState,
  PlayerState,
  CardInstance,
  Permanent,
  PRIVATE_VIEW_TAG,
  PRIVATE_DECISION_VIEW_TAG,
  CARD_ID_VIEW_TAG,
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
import { extractCardAt, insertCard, installVisibilityPort, placePermanent } from "./access.js";
import { exposeCardInZone } from "./visibility.js";
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

/**
 * Multi-view variants of the two helpers above. The single-view ones call
 * `discardChanges()` immediately, which is correct for one client but starves any further
 * view of the same patch — the room encodes every connected client from one `encode()` pass,
 * so a two-seat test has to do the same.
 */
type ViewTarget = { view: StateView; decoder: Decoder<GameState> };

function encodeAllForViews(state: GameState, targets: readonly ViewTarget[]): void {
  const encoder = encoderByState.get(state)!;
  const iterator = { offset: 0 };
  encoder.encodeAll(iterator);
  const sharedOffset = iterator.offset;
  for (const { view, decoder } of targets) {
    iterator.offset = sharedOffset;
    decoder.decode(encoder.encodeAllView(view, sharedOffset, iterator));
  }
  encoder.discardChanges();
}

function encodePatchForViews(state: GameState, targets: readonly ViewTarget[]): void {
  const encoder = encoderByState.get(state)!;
  const iterator = { offset: 0 };
  encoder.encode(iterator);
  const sharedOffset = iterator.offset;
  for (const { view, decoder } of targets) {
    iterator.offset = sharedOffset;
    decoder.decode(encoder.encodeView(view, sharedOffset, iterator));
  }
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

  it("makes the viewer's own hand and security visible", () => {
    const view = buildStateView(state, 0);
    const own = state.players[0]!;
    expect(view.has(own.hand)).toBe(true);
    expect(view.has(own.security)).toBe(true);
  });

  it("hides the viewer's own deck and egg deck from them too", () => {
    const view = buildStateView(state, 0);
    const own = state.players[0]!;
    // HIDDEN_ZONE_VIEW_TAG is granted to no view: a shuffled pile is secret from its owner.
    expect(view.has(own.deck)).toBe(false);
    expect(view.has(own.eggDeck)).toBe(false);
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

  it("reveals a face-down public stack card's identity only to its owner", () => {
    const owner = state.players[0]!;
    const top = owner.hand.pop()!;
    const hiddenStackCard = owner.hand.pop()!;
    hiddenStackCard.faceUp = false;
    const permanent = new Permanent();
    permanent.permanentId = "perm-face-down-stack";
    permanent.controllerSeat = 0;
    permanent.topCard = top;
    permanent.stack = new ArraySchema<CardInstance>(hiddenStackCard);
    owner.battleArea = new ArraySchema<Permanent>(permanent);

    const ownerView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);
    expect(ownerView.hasTag(hiddenStackCard, CARD_ID_VIEW_TAG)).toBe(true);
    expect(opponentView.hasTag(hiddenStackCard, CARD_ID_VIEW_TAG)).toBe(false);

    const ownerDecoder = new Decoder(new GameState());
    encodeAllForView(state, ownerView, ownerDecoder);
    expect(ownerDecoder.state.players[0]!.battleArea[0]!.stack[0]!.cardId).toBe("TEST-001");

    const opponentDecoder = new Decoder(new GameState());
    encodeAllForView(state, opponentView, opponentDecoder);
    expect(opponentDecoder.state.players[0]!.battleArea[0]!.stack[0]!.cardId).toBeUndefined();
  });

  it("keeps a face-down Delay card identifiable to its owner and hidden from the opponent", () => {
    const owner = state.players[0]!;
    const delayCard = owner.hand.pop()!;
    delayCard.faceUp = false;
    owner.delayZone = new ArraySchema<CardInstance>(delayCard);

    const ownerView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);
    expect(ownerView.hasTag(delayCard, CARD_ID_VIEW_TAG)).toBe(true);
    expect(opponentView.hasTag(delayCard, CARD_ID_VIEW_TAG)).toBe(false);
  });

  it("refreshes after a card moves between schema zones", () => {
    const view = buildStateView(state, 0);
    const player = state.players[0]!;
    const moved = extractCardAt(player, Zone.Hand, 0)!;
    insertCard(player, Zone.Trash, moved);

    expect(() => refreshStateView(view, state, 0)).not.toThrow();
  });

  /** Detach `card.digivolveTargetPermanentIds` the way a remove/reinsert sequence does. */
  function detachTargetsList(card: CardInstance): ArraySchema<string> {
    const nested = card.digivolveTargetPermanentIds;
    while (nested[$changes].root !== undefined) {
      nested[$changes].root.remove(nested[$changes]);
    }
    nested[$changes].removeParent(card);
    expect(nested[$changes].root).toBeUndefined();
    expect(nested[$changes].parent).toBeUndefined();
    return nested;
  }

  it("reattaches a detached nested card schema in place, preserving its refId", () => {
    const player = state.players[0]!;
    const card = extractCardAt(player, Zone.Hand, 0)!;
    insertCard(player, Zone.Trash, card);
    const nested = card.digivolveTargetPermanentIds;
    nested.push("perm-a");
    detachTargetsList(card);
    const refIdBeforeRepair = nested[$changes].refId;

    // The snapshot sweep is one of the two repair entry points (the other is per-arrival,
    // below). Either way the SAME tree is reattached: a fresh ArraySchema would strand every
    // client that already knows the old ref, which decodes as `"refId" not found`.
    const view = buildStateView(state, 0);

    expect(card.digivolveTargetPermanentIds).toBe(nested);
    expect(nested[$changes].refId).toBe(refIdBeforeRepair);
    expect(Array.from(card.digivolveTargetPermanentIds)).toEqual(["perm-a"]);
    expect(nested[$changes].root).toBeDefined();
    expect(nested[$changes].parent).toBe(card);

    const decoder = new Decoder(new GameState());
    encodeAllForView(state, view, decoder);
    const clientPlayer = decoder.state.players[0]!;
    expect(clientPlayer.hand.some(({ instanceId }) => instanceId === card.instanceId)).toBe(false);
    const clientCard = clientPlayer.trash.find(({ instanceId }) => instanceId === card.instanceId);
    expect(clientCard).toBeDefined();
    expect(Array.from(clientCard!.digivolveTargetPermanentIds)).toEqual(["perm-a"]);
  });

  it("repairs an arriving card through the visibility port, without any sweep", () => {
    const view = buildStateView(state, 0);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, view, decoder);
    installVisibilityPort(state.players[0]!, (ownerSeat, zone, card) => {
      exposeCardInZone(view, 0, ownerSeat, zone, card);
    });

    const player = state.players[0]!;
    const card = extractCardAt(player, Zone.Hand, 0)!;
    card.digivolveTargetPermanentIds.push("perm-b");
    const nested = detachTargetsList(card);
    const refIdBeforeRepair = nested[$changes].refId;

    // No refresh, no sweep: the arrival itself has to repair the card.
    insertCard(player, Zone.Trash, card);

    expect(card.digivolveTargetPermanentIds).toBe(nested);
    expect(nested[$changes].refId).toBe(refIdBeforeRepair);
    expect(nested[$changes].parent).toBe(card);

    syncPublicCounts(state);
    expect(() => refreshStateView(view, state, 0)).not.toThrow();
    encodePatchForView(state, view, decoder);
    const clientCard = decoder.state.players[0]!.trash.find(({ instanceId }) => instanceId === card.instanceId);
    expect(clientCard).toBeDefined();
    expect(Array.from(clientCard!.digivolveTargetPermanentIds)).toEqual(["perm-b"]);
  });
});

describe("visibility port (per-move exposure)", () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState();
  });

  /**
   * Wire both seats' StateViews to the mutation seam the way AegisRoom does, so a test can
   * move cards through `insertCard` and have the views updated by arrival alone.
   */
  function wirePort(views: readonly StateView[]): void {
    for (const player of state.players) {
      installVisibilityPort(player, (owner, zone, card) => {
        views.forEach((view, viewerSeat) => {
          exposeCardInZone(view, viewerSeat as Seat, owner, zone, card);
        });
      });
    }
  }

  it("keeps a card private to its owner when it arrives in a private zone", () => {
    const ownerView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);
    wirePort([ownerView, opponentView]);

    const ownerDecoder = new Decoder(new GameState());
    const opponentDecoder = new Decoder(new GameState());
    const targets = [
      { view: ownerView, decoder: ownerDecoder },
      { view: opponentView, decoder: opponentDecoder },
    ];
    encodeAllForViews(state, targets);

    const drawn = makeCard("late-draw", 0);
    insertCard(state.players[0]!, Zone.Hand, drawn);
    syncPublicCounts(state);
    encodePatchForViews(state, targets);

    const ownerHand = ownerDecoder.state.players[0]!.hand;
    expect(ownerHand.some(({ instanceId }) => instanceId === "late-draw")).toBe(true);
    // The opponent gets the count mirror and nothing else.
    expect(opponentDecoder.state.players[0]!.hand.length).toBe(0);
    expect(opponentDecoder.state.players[0]!.handCount).toBe(ownerHand.length);
  });

  /**
   * The property `refreshStateView`'s old per-patch walk existed to guarantee, now carried by
   * arrival-time exposure alone: a view that learned a card when it entered the hand still
   * recognises it when it leaves, so the encoder emits the DELETE instead of dropping it and
   * stranding a phantom copy in the client's hand forever.
   */
  it("encodes the removal of a card exposed only at arrival time", () => {
    const ownerView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);
    wirePort([ownerView, opponentView]);

    const ownerDecoder = new Decoder(new GameState());
    encodeAllForView(state, ownerView, ownerDecoder);

    const player = state.players[0]!;
    const drawn = makeCard("played-card", 0);
    insertCard(player, Zone.Hand, drawn);
    syncPublicCounts(state);
    encodePatchForView(state, ownerView, ownerDecoder);
    expect(ownerDecoder.state.players[0]!.hand.some(({ instanceId }) => instanceId === "played-card")).toBe(true);

    // Move it out WITHOUT any view refresh — arrival-time exposure must carry the delete.
    const moved = extractCardAt(player, Zone.Hand, player.hand.length - 1)!;
    insertCard(player, Zone.Trash, moved);
    syncPublicCounts(state);
    encodePatchForView(state, ownerView, ownerDecoder);

    const clientPlayer = ownerDecoder.state.players[0]!;
    expect(clientPlayer.hand.some(({ instanceId }) => instanceId === "played-card")).toBe(false);
    expect(clientPlayer.trash.some(({ instanceId }) => instanceId === "played-card")).toBe(true);
  });

  it("shows a card arriving in a public zone to both seats", () => {
    const ownerView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);
    wirePort([ownerView, opponentView]);

    const ownerDecoder = new Decoder(new GameState());
    const opponentDecoder = new Decoder(new GameState());
    const targets = [
      { view: ownerView, decoder: ownerDecoder },
      { view: opponentView, decoder: opponentDecoder },
    ];
    encodeAllForViews(state, targets);

    const trashed = makeCard("to-trash", 0);
    insertCard(state.players[0]!, Zone.Trash, trashed);
    syncPublicCounts(state);
    encodePatchForViews(state, targets);

    for (const decoder of [ownerDecoder, opponentDecoder]) {
      const card = decoder.state.players[0]!.trash.find(({ instanceId }) => instanceId === "to-trash");
      expect(card).toBeDefined();
      expect(card!.cardId).toBe("TEST-001"); // face-up: identity revealed to both
    }
  });

  it("does not re-send private zone contents on every patch", () => {
    const ownerView = buildStateView(state, 0);
    wirePort([ownerView]);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, ownerView, decoder);
    // `encodeAllView` does not drain `view.changes` (only `encodeView` does), so the forced
    // ADDs `buildStateView` queued for the initial snapshot are still pending. Spend them on
    // one throwaway patch; what matters is the STEADY-STATE patch that follows.
    encodePatchForView(state, ownerView, decoder);

    // A patch that changes one unrelated public field must not drag the whole hand/deck along.
    state.players[0]!.deckCount = 36;
    // Exactly what AegisRoom.onBeforePatch does. Before the private-zone walk was removed from
    // this path it re-queued a forced ADD for every field of all 46 private cards, every patch.
    refreshStateView(ownerView, state, 0);
    const encoder = encoderByState.get(state)!;
    const iterator = { offset: 0 };
    encoder.encode(iterator);
    const bytes = encoder.encodeView(ownerView, iterator.offset, iterator);
    encoder.discardChanges();

    // 46 private cards live in this fixture; re-adding them would run to hundreds of bytes.
    expect(bytes.byteLength).toBeLessThan(64);
  });

  /**
   * Layer C's payoff: a permanent's cards are announced as they arrive, so a refresh no longer
   * walks the board. Patch cost must not track board size either.
   */
  it("keeps patch size flat as the board fills", () => {
    const ownerView = buildStateView(state, 0);
    wirePort([ownerView]);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, ownerView, decoder);
    encodePatchForView(state, ownerView, decoder); // drain the join-time forced ADDs

    const encoder = encoderByState.get(state)!;
    const patchSize = (): number => {
      refreshStateView(ownerView, state, 0);
      const iterator = { offset: 0 };
      encoder.encode(iterator);
      const bytes = encoder.encodeView(ownerView, iterator.offset, iterator);
      encoder.discardChanges();
      return bytes.byteLength;
    };

    state.players[0]!.deckCount = 36;
    const emptyBoard = patchSize();

    const player = state.players[0]!;
    for (let i = 0; i < 5; i += 1) {
      const permanent = new Permanent();
      permanent.permanentId = `perm-${i}`;
      permanent.controllerSeat = 0;
      permanent.topCard = makeCard(`top-${i}`, 0);
      for (let j = 0; j < 3; j += 1) permanent.stack.push(makeCard(`stack-${i}-${j}`, 0));
      placePermanent(player, permanent);
    }
    encodePatchForView(state, ownerView, decoder); // the arrivals themselves, sent once

    state.players[0]!.deckCount = 35;
    const fullBoard = patchSize();

    expect(decoder.state.players[0]!.battleArea.length).toBe(5);
    expect(fullBoard).toBeLessThanOrEqual(emptyBoard + 8);
  });

  /**
   * Trash grows all match, so a per-patch walk of it made every patch cost more than the
   * last — the "it gets laggy after a while" shape. Patch cost must not track trash size.
   */
  it("keeps patch size flat as the trash grows", () => {
    const ownerView = buildStateView(state, 0);
    wirePort([ownerView]);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, ownerView, decoder);
    encodePatchForView(state, ownerView, decoder); // drain the join-time forced ADDs

    const encoder = encoderByState.get(state)!;
    const patchSize = (): number => {
      refreshStateView(ownerView, state, 0);
      const iterator = { offset: 0 };
      encoder.encode(iterator);
      const bytes = encoder.encodeView(ownerView, iterator.offset, iterator);
      encoder.discardChanges();
      return bytes.byteLength;
    };

    state.players[0]!.deckCount = 36;
    const withEmptyTrash = patchSize();

    for (let i = 0; i < 30; i += 1) insertCard(state.players[0]!, Zone.Trash, makeCard(`trash-${i}`, 0));
    encodePatchForView(state, ownerView, decoder); // the arrivals themselves, sent once

    state.players[0]!.deckCount = 35;
    const withFullTrash = patchSize();

    expect(decoder.state.players[0]!.trash.length).toBe(30);
    expect(withFullTrash).toBeLessThanOrEqual(withEmptyTrash + 8);
  });
});

describe("hidden zone redaction (what the owner's own client receives)", () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState();
  });

  /** Decode a full snapshot the way a joining client would, and return its copy of the state. */
  function decodeForSeat(seat: Seat): GameState {
    const view = buildStateView(state, seat);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, view, decoder);
    return decoder.state;
  }

  it("never sends the deck or egg deck to their owner, only the counts", () => {
    syncPublicCounts(state);
    const mine = decodeForSeat(0).players[0]!;

    // Deck ORDER is the decisive secret: knowing the draw sequence decides games. It must not
    // reach the browser at all, not even redacted — an instanceId list still tracks a known
    // card through a shuffle.
    expect(mine.deck.length).toBe(0);
    expect(mine.eggDeck.length).toBe(0);
    expect(mine.deckCount).toBe(37);
    expect(mine.eggDeckCount).toBe(4);
  });

  it("still sends the owner their own hand, with identities", () => {
    const mine = decodeForSeat(0).players[0]!;
    expect(mine.hand.length).toBe(5);
    for (const card of mine.hand) expect(card.cardId).toBe("TEST-001");
  });

  it("sends the owner their face-down security as anonymous cards", () => {
    syncPublicCounts(state);
    const mine = decodeForSeat(0).players[0]!;

    // The stack is there (the client counts it and reads faceUp), but §3-4-3 says a player may
    // not look at their own security, so no identity travels.
    expect(mine.security.length).toBe(5);
    expect(mine.securityCount).toBe(5);
    for (const card of mine.security) {
      expect(card.instanceId).toBeTruthy(); // the card object arrives...
      expect(card.faceUp).toBe(false);
      expect(card.cardId).toBeFalsy(); // ...but never carries an identity
    }
  });

  it("sends the identity of a security card that is already face-up", () => {
    const owner = state.players[0]!;
    owner.security[2]!.faceUp = true;
    const mine = decodeForSeat(0).players[0]!;

    const revealed = mine.security.find((card) => card.faceUp);
    expect(revealed?.cardId).toBe("TEST-001");
    expect(mine.security.filter((card) => !card.faceUp).every((card) => !card.cardId)).toBe(true);
  });

  it("keeps the opponent blind to every hidden zone", () => {
    syncPublicCounts(state);
    const theirs = decodeForSeat(1).players[0]!;
    expect(theirs.deck.length).toBe(0);
    expect(theirs.eggDeck.length).toBe(0);
    expect(theirs.hand.length).toBe(0);
    expect(theirs.security.length).toBe(0);
    // Counts are public so the opponent can render the piles.
    expect(theirs.deckCount).toBe(37);
    expect(theirs.handCount).toBe(5);
  });

  it("reveals a card's identity to the owner as it is drawn into hand", () => {
    const view = buildStateView(state, 0);
    const decoder = new Decoder(new GameState());
    encodeAllForView(state, view, decoder);
    installVisibilityPort(state.players[0]!, (owner, zone, card) => {
      exposeCardInZone(view, 0, owner, zone, card);
    });

    const player = state.players[0]!;
    const drawn = extractCardAt(player, Zone.Deck, 0)!;
    insertCard(player, Zone.Hand, drawn);
    syncPublicCounts(state);
    encodePatchForView(state, view, decoder);

    const clientCard = decoder.state.players[0]!.hand.find(({ instanceId }) => instanceId === drawn.instanceId);
    expect(clientCard).toBeDefined();
    expect(clientCard!.cardId).toBe("TEST-001");
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
