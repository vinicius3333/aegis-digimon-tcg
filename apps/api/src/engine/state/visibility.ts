import { $changes, ArraySchema, StateView } from "@colyseus/schema";
import {
  PRIVATE_VIEW_TAG,
  PRIVATE_DECISION_VIEW_TAG,
  type CardInstance,
  type GameState,
  type Permanent,
  type PlayerState,
  type Seat,
} from "@aegis/shared";

/**
 * Per-viewer visibility filtering for the authoritative GameState
 * (subsystem: game-state-schema; sources: documented behavior, documented behavior, documented behavior).
 *
 * The synchronized schema is one shared tree, but each seat must see a different
 * slice of it: you see your own hand, deck, egg deck and face-down security; your
 * opponent sees only public information about those zones (their counts) plus the
 * fully public board (battle areas, breeding, trash, memory, phase, ...).
 *
 * Colyseus implements this with `StateView` + the `@view()` field tag: a tagged
 * field is withheld from every view by default and only encoded for a view that has
 * explicitly added the OWNING object with that tag. The secret PlayerState zones
 * carry `@view(PRIVATE_VIEW_TAG)` (see @aegis/shared PlayerState); this module is
 * the server-side policy that decides which objects each seat's view unlocks.
 *
 * Everything here is pure with respect to game rules: it reads GameState and
 * constructs/feeds a StateView. It never advances the game. The single exception is
 * syncPublicCounts, which writes only the derived public-count mirror fields (it
 * changes no zone and no card).
 *
 * The seat-specific view and per-card
 * `CardSource.IsFaceUp` decided what was rendered face-up vs as a reverse-side
 * placeholder. On an authoritative server that redaction must happen at the data
 * layer (a hidden card must never be sent at all), which is what StateView does.
 */

/** All four owner-private zones of a PlayerState, in a stable order. */
function privateZonesOf(player: PlayerState): readonly CardInstance[][] {
  return [Array.from(player.deck), Array.from(player.eggDeck), Array.from(player.hand), Array.from(player.security)];
}

/**
 * Every face-up, publicly-visible CardInstance a player controls on the board:
 * the cards making up each battle-area permanent (active card + digivolution
 * stack + linked cards) and the same for the breeding permanent, plus the trash.
 *
 * These need explicit per-view exposure because of a @colyseus/schema quirk: once
 * a CardInstance has lived in a @view-tagged zone (hand/deck/eggDeck/security) its
 * ChangeTree is permanently stamped `isFiltered = true`, and that flag is NOT
 * recomputed when the card later moves to a public, untagged field like
 * Permanent.topCard (ChangeTree.checkIsFiltered only re-runs when the root changes,
 * which a same-tree move is not). A filtered ChangeTree stays withheld from every
 * view that hasn't explicitly added it, so the opponent would decode topCard as
 * undefined. Force-adding each public card to the view fixes this.
 */
function publicBoardCardsOf(player: PlayerState): CardInstance[] {
  const cards: CardInstance[] = [];
  const collectPermanent = (permanent: Permanent | undefined): void => {
    if (permanent === undefined) return;
    if (permanent.topCard !== undefined) cards.push(permanent.topCard);
    cards.push(...permanent.stack, ...permanent.linked);
  };
  for (const permanent of player.battleArea) collectPermanent(permanent);
  collectPermanent(player.breeding);
  cards.push(...player.trash);
  // §9-1-4: an Option resolving between activation and resolution of its 1st [Main]
  // effect. It was revealed to be used (§9-1-9-1), so it is public the same as any
  // board card, and needs the same forced re-add (see the ChangeTree note above).
  if (player.resolvingOption !== undefined) cards.push(player.resolvingOption);
  return cards;
}

/**
 * Restore the only nested schema owned by CardInstance when Colyseus has lost its
 * parent link during a remove/reinsert sequence. A reachable card is authoritative
 * state; leaving its child detached makes StateView.add() throw and aborts the game
 * action that happened to trigger a visibility refresh.
 *
 * Replacing only the corrupt child preserves its projected values and lets the
 * CardInstance field setter attach the fresh ArraySchema to the card's current root.
 * Healthy cards are untouched, so normal patches keep their object identity.
 */
function repairDetachedCardSchemas(state: GameState): void {
  const cards = new Set<CardInstance>();
  const addPermanent = (permanent: Permanent | undefined): void => {
    if (permanent?.topCard !== undefined) cards.add(permanent.topCard);
    for (const card of permanent?.stack ?? []) cards.add(card);
    for (const card of permanent?.linked ?? []) cards.add(card);
  };

  for (const player of state.players) {
    for (const zone of privateZonesOf(player)) {
      for (const card of zone) cards.add(card);
    }
    for (const card of player.trash) cards.add(card);
    for (const card of player.delayZone) cards.add(card);
    if (player.resolvingOption !== undefined) cards.add(player.resolvingOption);
    for (const permanent of player.battleArea) addPermanent(permanent);
    addPermanent(player.breeding);
  }

  for (const card of cards) {
    const targets = card.digivolveTargetPermanentIds;
    const cardTree = card[$changes];
    const targetsTree = targets[$changes];
    if (targetsTree.parent === card && targetsTree.root === cardTree?.root) continue;
    card.digivolveTargetPermanentIds = new ArraySchema<string>(...targets);
  }
}

/**
 * Recompute the public per-zone count fields from the private arrays. These are the
 * only facts about a hidden zone the opponent is allowed to know (mirrors the
 * source HUD showing `HandCards.Count`, `LibraryCards.Count`,
 * `DigitamaLibraryCards.Count`, and the security stack size).
 *
 * Idempotent and side-effect-scoped to the *Count fields. The engine is the single
 * writer of GameState and decides when to call this (at minimum once before each
 * state patch is broadcast, so the counts track the arrays). Returns the same state
 * for convenient chaining in tests.
 */
export function syncPublicCounts(state: GameState): GameState {
  for (const player of state.players) {
    player.deckCount = player.deck.length;
    player.eggDeckCount = player.eggDeck.length;
    player.handCount = player.hand.length;
    player.securityCount = player.security.length;
  }
  return state;
}

/**
 * Unlock `seat`'s own PlayerState private zones (deck, egg deck, hand, security)
 * into `view` and nothing of the opponent's. Untagged fields (the whole public
 * board) are visible to every view automatically, so they need no `add`.
 *
 * Face-up security: a security card turned face-up while still in the security zone
 * is public and must be shown to the opponent too. The base view leaves all of the
 * opponent's security hidden; call revealSecurityCardToOpponent for each such card
 * (the security-and-win-check subsystem drives this as cards flip). The common case
 * — flip the top security card and immediately resolve it out of the zone — needs no
 * special handling here, because once the card moves to a public zone (trash or a
 * battle-area Permanent) it is no longer behind the security `@view` tag.
 *
 * ADD-ONLY: every call only ever calls `view.add(...)`, never `view.remove(...)`,
 * so it is always safe to call repeatedly on the SAME `view` instance to bring it
 * up to date with the current state (see `refreshStateView`'s doc for why that
 * matters — replacing the view wholesale loses track of cards that just left a
 * private zone and drops their removal from the next patch).
 */
function unlockInto(view: StateView, state: GameState, seat: Seat): void {
  repairDetachedCardSchemas(state);
  const owner = state.players[seat];
  if (owner !== undefined) {
    // Unlock exactly this seat's private fields. A single PRIVATE_VIEW_TAG is safe:
    // Colyseus scopes the reveal to this specific PlayerState object, so the
    // opponent's identically-tagged fields stay hidden (they were never added).
    view.add(owner, PRIVATE_VIEW_TAG);
  }
  if (state.pendingDecision?.seat === seat) {
    view.add(state.pendingDecision, PRIVATE_DECISION_VIEW_TAG);
  }

  // Reveal any security cards already face-up to BOTH players (e.g. set face-up by
  // a prior effect). Newly flipped cards are handled incrementally as they flip.
  for (const player of state.players) {
    if (player === owner) continue;
    for (const card of player.security) {
      if (card.faceUp) view.add(card, PRIVATE_VIEW_TAG);
    }
  }

  // Expose every player's public board cards to this seat. Cards that passed
  // through a @view-tagged zone keep a stale `isFiltered` flag after moving to a
  // public field (see publicBoardCardsOf), so without this the opponent's battle
  // area decodes with topCard=undefined. Adding the owner's own cards too is
  // harmless (idempotent) and keeps the policy uniform.
  for (const player of state.players) {
    for (const card of publicBoardCardsOf(player)) view.add(card);
  }
}

/**
 * Build a brand-new StateView for one seat. Use this ONLY for a seat's first view
 * (initial join) or a full resync (reconnect), both of which send the client a
 * complete state snapshot rather than a delta — see `refreshStateView` for why a
 * fresh StateView must never be substituted for an existing one mid-match.
 *
 * Pure: constructs and returns a fresh StateView; mutates no GameState.
 */
export function buildStateView(state: GameState, seat: Seat): StateView {
  const view = new StateView();
  unlockInto(view, state, seat);
  return view;
}

/**
 * Bring an EXISTING StateView up to date with the current state, in place — the
 * mid-match counterpart to `buildStateView`. Callers must reuse the same StateView
 * instance for a seat's whole connected session and refresh it via this function,
 * never replace it with `buildStateView`'s fresh instance once the match is under
 * way.
 *
 * Why: `@colyseus/schema`'s StateView tracks visibility per ChangeTree in a
 * `WeakSet` scoped to that ONE StateView instance. A card that just left a
 * `@view`-tagged zone (e.g. played from hand) needs its owning view to still
 * recognize it as visible at the moment its removal is encoded, so the encoder
 * emits the DELETE op — that recognition lives only in the OLD view (built while
 * the card was still in the zone). Discarding that view for a freshly-built one
 * (whose recursive `unlockInto` walk only sees zones' CURRENT contents) permanently
 * strands the delete: the new view never learns the card was ever visible, so the
 * encoder silently drops the removal and the client's copy of the zone keeps the
 * card forever (confirmed via a standalone encode/decode repro against
 * `@colyseus/schema` 3.0.76 — not a timing race, the update never arrives).
 * `unlockInto` only ever calls `view.add(...)`, so calling it repeatedly on the
 * same instance is safe/idempotent and requires no matching `view.remove(...)`.
 */
export function refreshStateView(view: StateView, state: GameState, seat: Seat): void {
  unlockInto(view, state, seat);
}

/**
 * Expose a single security CardInstance — one that has been turned face-up but is
 * still sitting in its owner's security zone — to a viewer who would otherwise have
 * it hidden (its owner's opponent). Adding the specific child with the same tag
 * unlocks just that element, leaving the rest of the security stack redacted.
 *
 * Call this from the flip step that sets `card.faceUp = true` while the card remains
 * in security. No-op-safe to call for the owner's own view.
 */
export function revealSecurityCardToOpponent(view: StateView, card: CardInstance): void {
  view.add(card, PRIVATE_VIEW_TAG);
}

/**
 * Diagnostics-only: the private zones of a player as plain arrays. Used by tests and
 * any future server-side audit to assert what would be redacted. Not part of the
 * sync path.
 */
export function privateZoneSnapshot(player: PlayerState): readonly CardInstance[][] {
  return privateZonesOf(player);
}
