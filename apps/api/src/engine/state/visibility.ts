import { $changes, type Metadata, StateView } from "@colyseus/schema";
import { type VisibilityZone, isHiddenZone, isOwnerPrivateZone } from "./access.js";
import {
  PRIVATE_VIEW_TAG,
  PRIVATE_DECISION_VIEW_TAG,
  CARD_ID_VIEW_TAG,
  CardInstance,
  type GameState,
  type Permanent,
  type PlayerState,
  type Seat,
  Zone,
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

/**
 * Schema field index of `CardInstance.digivolveTargetPermanentIds`, read from the
 * generated metadata rather than written down, so reordering the class's fields
 * cannot silently point the repair below at the wrong field.
 */
const DIGIVOLVE_TARGETS_FIELD_INDEX = (CardInstance[Symbol.metadata] as Metadata)[
  "digivolveTargetPermanentIds"
] as number;

/** All four owner-private zones of a PlayerState, in a stable order. */
function privateZonesOf(player: PlayerState): readonly CardInstance[][] {
  return [Array.from(player.deck), Array.from(player.eggDeck), Array.from(player.hand), Array.from(player.security)];
}

/**
 * Every face-up, publicly-visible CardInstance a player controls on the board:
 * the cards making up each battle-area permanent (active card + digivolution
 * stack + linked cards) and the same for the breeding permanent, plus the trash
 * and face-down Delay zone.
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
function publicBoardCardsOf(player: PlayerState, includeLooseZones: boolean): CardInstance[] {
  const cards: CardInstance[] = [];
  const collectPermanent = (permanent: Permanent | undefined): void => {
    if (permanent === undefined) return;
    if (permanent.topCard !== undefined) cards.push(permanent.topCard);
    cards.push(...permanent.stack, ...permanent.linked);
  };
  for (const permanent of player.battleArea) collectPermanent(permanent);
  collectPermanent(player.breeding);
  // Trash and the Delay zone are loose zones behind the mutation seam, so mid-match each
  // arrival is exposed once by the VisibilityPort. Only a full snapshot walks them — and
  // trash in particular GROWS all match, so re-adding it per patch made every patch more
  // expensive than the last.
  if (includeLooseZones) {
    cards.push(...player.trash);
    cards.push(...player.delayZone);
  }
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
 * Why the link is lost: moving a card out of a zone drops its ChangeTree refCount to
 * zero, and `Root.remove` then clears `root` on the card AND on every child tree it
 * owns. Re-inserting the card calls `ChangeTree.setRoot`, which only recurses into
 * children when the card itself is new to the root (`isNewChangeTree`); a card still
 * referenced from somewhere else fails that guard, so its `digivolveTargetPermanentIds`
 * keeps `root: undefined` while the card is live again.
 *
 * REPAIR IN PLACE, NEVER REASSIGN. Assigning a fresh ArraySchema retires the old refId
 * and mints a new one mid-encode. Any view that already knows the card but does not
 * receive the matching ADD decodes a dangling pointer, and the client throws
 * `"refId" not found` followed by `digivolveTargetPermanentIds is not iterable`.
 * `setParent` re-attaches the SAME tree: `addParent` dedupes by ChangeTree so a
 * still-correct parent link is untouched, and `Root.add` re-queues the list's contents
 * as ADD ops so a client that missed it while detached is brought back up to date.
 * Healthy cards fall out at the guard below and keep both their identity and their refId.
 */
function repairDetachedCardSchema(card: CardInstance): void {
  const cardTree = card[$changes];
  const root = cardTree?.root;
  const targetsTree = card.digivolveTargetPermanentIds[$changes];
  if (targetsTree.parent === card && targetsTree.root === root) return;
  // `root` may legitimately be undefined here and the repair still matters: a card sitting in a
  // digivolution stack can have a live parentChain but no root, and `StateView.add` rejects a
  // child on the PARENT link alone ("Cannot add a detached instance"). Passing the undefined
  // root through is deliberate — `setParent` restores the parentChain and returns early, which
  // is exactly the part `view.add` checks. Guarding on `root !== undefined` instead skips these
  // cards and the next view refresh throws mid-action, stalling the match.
  targetsTree.setParent(card, root, DIGIVOLVE_TARGETS_FIELD_INDEX);
}

/**
 * {@link repairDetachedCardSchema} over every card a view can reach. The per-move path
 * repairs the single arriving card; a view rebuild has to sweep them all, because a card
 * can be detached by a move that predates the port being installed.
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

  for (const card of cards) repairDetachedCardSchema(card);
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
function unlockInto(view: StateView, state: GameState, seat: Seat, fullSnapshot: boolean): void {
  const owner = state.players[seat];
  // A full snapshot walks the whole tree, so every card it touches has to be sound first.
  // Nothing below this walks cards on a plain refresh, so the sweep is snapshot-only; each
  // arriving card is repaired individually by `exposeCardInZone` instead.
  if (fullSnapshot) repairDetachedCardSchemas(state);
  if (owner !== undefined) {
    // Unlock exactly this seat's private fields. A single PRIVATE_VIEW_TAG is safe:
    // Colyseus scopes the reveal to this specific PlayerState object, so the
    // opponent's identically-tagged fields stay hidden (they were never added).
    //
    // ONCE per view, not once per patch. `StateView.add` recurses through every child whose
    // tag matches or is absent, and PlayerState's public collections (trash, battle area,
    // delay zone) carry no tag — so repeating this walked the seat's entire subtree on every
    // patch, and threw outright if any card down there had a detached child list. The tag
    // only has to be granted once; the view never forgets it.
    if (!view.hasTag(owner, PRIVATE_VIEW_TAG)) view.add(owner, PRIVATE_VIEW_TAG);
    // Only on a full snapshot. Mid-match, each private-zone card is exposed once as it
    // arrives (`exposeCardInZone`, driven by the mutation seam's VisibilityPort); walking
    // every deck/hand/security card again per patch would re-queue a forced ADD for every
    // field of every card, which is what made each patch cost a full state re-encode.
    if (fullSnapshot) {
      for (const card of owner.hand) {
        view.add(card);
        view.add(card, CARD_ID_VIEW_TAG);
      }
      // Security identity is withheld from the owner too: a player may not look at their own
      // security stack (Comprehensive Rules §3-4-3), so only a card already turned face-up
      // gets its cardId. Deck and egg deck are absent entirely — HIDDEN_ZONE_VIEW_TAG is
      // granted to no view, so the arrays are never encoded and there is nothing to tag.
      for (const card of owner.security) {
        view.add(card);
        if (card.faceUp) view.add(card, CARD_ID_VIEW_TAG);
      }
    }
  }
  // Added once per decision, not once per patch. `PendingDecision.payloadJson` carries the
  // whole candidate list, and `StateView.add` force-queues an ADD for it, so re-adding while
  // a decision sat open re-sent the entire blob 20 times a second. Later edits to the payload
  // still reach the view through the normal tagged-change path; the forced ADD is only needed
  // to make the object visible in the first place, and a new decision is a new ChangeTree.
  if (state.pendingDecision?.seat === seat && !view.has(state.pendingDecision)) {
    view.add(state.pendingDecision, PRIVATE_DECISION_VIEW_TAG);
  }

  // Reveal any security card already face-up to BOTH players (e.g. set face-up by a prior
  // effect). Newly flipped cards are handled incrementally as they flip
  // (revealSecurityCardToOpponent), so this only has to catch up a view that is being built or
  // has not seen a given card yet — hence the `hasTag` guard rather than an unconditional re-add.
  for (const player of state.players) {
    if (player === owner) continue;
    for (const card of player.security) {
      if (!card.faceUp || view.hasTag(card, CARD_ID_VIEW_TAG)) continue;
      repairDetachedCardSchema(card);
      view.add(card, PRIVATE_VIEW_TAG);
      view.add(card, CARD_ID_VIEW_TAG);
    }
  }

  // Full snapshots only. Every public card is exposed as it arrives — the mutation seam now
  // covers the permanent fields too (`setTopCard`/`pushOnStack`/`linkCard`/`setBreeding`), so a
  // card reaching the board announces itself exactly once. A join or resync still needs the
  // whole walk, because a view built now has to learn about cards that arrived before it existed.
  if (!fullSnapshot) return;
  // Cards that passed through a @view-tagged zone keep a stale `isFiltered` flag after moving
  // to a public field (see publicBoardCardsOf), so without this the opponent's battle area
  // decodes with topCard=undefined. Adding the owner's own cards too is harmless (idempotent)
  // and keeps the policy uniform.
  for (const player of state.players) {
    for (const card of publicBoardCardsOf(player, fullSnapshot)) {
      view.add(card);
      if (card.faceUp || card.ownerSeat === seat) view.add(card, CARD_ID_VIEW_TAG);
    }
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
  unlockInto(view, state, seat, true);
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
  unlockInto(view, state, seat, false);
}

/**
 * Expose one card that just arrived in a loose zone to ONE viewer's StateView — the
 * per-move counterpart to the full walk in `unlockInto`, driven by the mutation seam's
 * `VisibilityPort`. Applies exactly the policy `unlockInto` applies in bulk:
 *
 * - private zone (deck/eggDeck/hand/security): only the owner learns the card exists;
 * - public zone (trash/delayZone): both seats see the card, and its identity is revealed
 *   to a viewer who either owns it or is looking at a face-up card.
 *
 * Called once per arrival, not once per patch. That is the whole point: `StateView.add`
 * force-queues an ADD for every field of the added object (and its children), so calling
 * it per patch for every card makes each patch carry the entire state.
 */
export function exposeCardInZone(
  view: StateView,
  viewerSeat: Seat,
  ownerSeat: Seat,
  zone: VisibilityZone,
  card: CardInstance,
): void {
  repairDetachedCardSchema(card);
  if (isHiddenZone(zone)) return; // deck / egg deck: encoded for nobody, owner included
  if (isOwnerPrivateZone(zone)) {
    if (viewerSeat !== ownerSeat) return;
    // Untagged fields first (instanceId, ownerSeat, faceUp, the projections). A card drawn out
    // of a hidden zone is genuinely NEW to this client — the deck was never encoded — and its
    // ChangeTree is filtered, so the re-ADD that `Root.add` queues on reinsertion lands in the
    // unfiltered change set the encoder does not read for a view. Without this the card
    // arrives in hand with `instanceId: undefined`. Adding with the default tag force-queues
    // every untagged field and fixes that; it deliberately does NOT reveal `cardId`, which is
    // tagged and therefore only travels on the explicit grant below.
    view.add(card);
    // Your hand is yours to read; your security stack is not (§3-4-3). A security card that is
    // later turned face-up is revealed then, by revealSecurityCardToOpponent + the flip path.
    if (zone === Zone.Hand || card.faceUp) view.add(card, CARD_ID_VIEW_TAG);
    return;
  }
  view.add(card);
  if (card.faceUp || card.ownerSeat === viewerSeat) view.add(card, CARD_ID_VIEW_TAG);
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
