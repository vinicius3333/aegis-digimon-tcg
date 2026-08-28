import { ArraySchema } from "@colyseus/schema";
import {
  type GameState,
  type PlayerState,
  type Permanent,
  type CardInstance,
  type Seat,
  type ServerEvent,
  CardKind,
  Zone,
  getCardDefinition,
  isTokenDefinition,
} from "@aegis/shared";

/**
 * The slice of `MemoryGauge` `<Overflow>` needs (mirrors `effects/primitives.ts`'s
 * `MemoryPort`): a structural type, not an import of the concrete class, so this module
 * stays decoupled from the memory-gauge subsystem and both `MemoryGauge` and `MemoryPort`
 * satisfy it without a cast.
 */
interface OverflowMemoryPort {
  addMemoryForSeat(seat: Seat, amount: number, reason?: string): void;
}

/**
 * The narration channel, in the same shape `MemoryGauge` and `WinCheck` take it: a plain
 * function, so a caller that only mutates state (most unit tests) constructs this class
 * without one and simply narrates nothing.
 */
type EventPort = (event: ServerEvent) => void;

/** A permanent's cards on their way to trash, with the field zone they left. */
interface DeletionMove {
  cards: CardInstance[];
  from: Zone.BattleArea | Zone.Breeding;
}

/**
 * The single mutation seam for game state. Every raw zone mutation lives in this
 * module and nowhere else — enforced by `mutationSeam.guard.test.ts`. Callers move
 * cards through these functions instead of touching `ArraySchema` directly, so the
 * owner-routing rule (a card always returns to its owner's zone) and future per-move
 * bookkeeping (visibility, count mirrors) have exactly one home to live in.
 *
 * The low-level functions take a `PlayerState` so state-free setup code and the
 * effect primitives (which already hold a `player()` accessor) can call them without
 * a GameStateAccess instance; `GameStateAccess` re-exposes the higher operations as
 * methods for the engine collaborators.
 */

/** The six zones that hold loose {@link CardInstance}s (battle area/breeding hold Permanents). */
export type CardZone = Zone.Deck | Zone.Hand | Zone.Security | Zone.Trash | Zone.EggDeck | Zone.Delay;

/**
 * Told when a card lands in a loose zone, so per-viewer visibility can be updated at the
 * moment of the move instead of by re-walking the whole state before every patch.
 *
 * Why a port rather than a direct call: this module is pure state mutation and must not
 * know about rooms, clients or StateViews (the same reason `OverflowMemoryPort` and
 * `EventPort` above are ports). `AegisRoom` installs the real implementation; every other
 * caller — unit tests, setup code, the bot — leaves it unset and the notification is a no-op.
 *
 * Insert-only by design. A view that already knows a card keeps knowing it (`unlockInto` is
 * add-only and `StateView` never forgets), and that memory is exactly what lets the encoder
 * emit the DELETE when the card leaves. So removals need no notification; only arrivals do.
 */
export type VisibilityPort = (ownerSeat: Seat, zone: VisibilityZone, card: CardInstance) => void;

/**
 * Where a card can arrive, for visibility purposes. The loose zones plus the two places a
 * Permanent holds cards — a battle-area or breeding permanent's top card, digivolution stack
 * and linked cards are all public, so they are exposed to both seats.
 */
export type VisibilityZone = CardZone | Zone.BattleArea | Zone.Breeding;

/**
 * Per-match storage for the visibility port, hung off the PlayerState rather than kept in a
 * module-level variable so concurrent matches (and parallel test files) never share it.
 */
const VISIBILITY_PORT = Symbol.for("aegis.visibilityPort");

type PortHost = { [VISIBILITY_PORT]?: VisibilityPort };

/** Cards of a permanent are public; both seats see them (see `exposeCardInZone`). */
export function isPermanentZone(zone: VisibilityZone): boolean {
  return zone === Zone.BattleArea || zone === Zone.Breeding;
}

/** Install the visibility port for one seat. Call once per player when the match is wired up. */
export function installVisibilityPort(player: PlayerState, port: VisibilityPort): void {
  (player as PortHost)[VISIBILITY_PORT] = port;
}

/** Notify the installed port, if any, that `card` just landed in `zone`. */
function notifyCardEntered(player: PlayerState, zone: CardZone, card: CardInstance): void {
  (player as PortHost)[VISIBILITY_PORT]?.(player.seat, zone, card);
}

/**
 * Carry the port from a seat onto a permanent as it is attached to the state.
 *
 * A Permanent is built detached — `topCard` and `stack` are written before it is placed — so
 * its cards cannot be exposed at the moment they are assigned; `StateView.add` rejects an
 * instance that is not in the state tree yet. The attach points (`placePermanent`,
 * `setBreeding`) are where the permanent joins the tree, so they both stamp the port onto it
 * and announce every card it already holds. Later in-place edits then read the port back off
 * the permanent, which is how the mutators below reach it without being handed a PlayerState.
 */
function adoptPermanent(player: PlayerState, permanent: Permanent): void {
  const port = (player as PortHost)[VISIBILITY_PORT];
  if (port === undefined) return;
  (permanent as PortHost)[VISIBILITY_PORT] = port;
  const zone = permanent.inBreeding ? Zone.Breeding : Zone.BattleArea;
  if (permanent.topCard !== undefined) port(player.seat, zone, permanent.topCard);
  for (const card of permanent.stack) port(player.seat, zone, card);
  for (const card of permanent.linked) port(player.seat, zone, card);
}

/** Announce one card added to an already-attached permanent. */
function notifyPermanentCard(permanent: Permanent, card: CardInstance): void {
  const zone = permanent.inBreeding ? Zone.Breeding : Zone.BattleArea;
  (permanent as PortHost)[VISIBILITY_PORT]?.(permanent.controllerSeat, zone, card);
}

/**
 * The shuffled piles whose contents nobody may read, their owner included: a player knows only
 * how many cards are in their deck and egg deck. Tagged HIDDEN_ZONE_VIEW_TAG in the schema,
 * which no StateView ever unlocks, so the arrays are encoded for no one.
 */
export function isHiddenZone(zone: VisibilityZone): boolean {
  return zone === Zone.Deck || zone === Zone.EggDeck;
}

/**
 * The zones the owner may see but the opponent may not (PRIVATE_VIEW_TAG). Seeing the ZONE is
 * not the same as seeing the cards: the owner reads their own hand, but a face-down security
 * card keeps its identity withheld from them too — see `exposeCardInZone`.
 */
export function isOwnerPrivateZone(zone: VisibilityZone): boolean {
  return zone === Zone.Hand || zone === Zone.Security;
}

/** Where a card lands in an ordered zone. `security[0]`/`deck[0]` are the "top". */
export type ZonePosition = "top" | "bottom";

/** Resolve a {@link CardZone} to its backing array, mapping Zone.Delay to the `delayZone` field. */
function zoneArrayOf(player: PlayerState, zone: CardZone): ArraySchema<CardInstance> {
  switch (zone) {
    case Zone.Deck:
      return player.deck;
    case Zone.Hand:
      return player.hand;
    case Zone.Security:
      return player.security;
    case Zone.Trash:
      return player.trash;
    case Zone.EggDeck:
      return player.eggDeck;
    case Zone.Delay:
      return player.delayZone;
  }
}

/** Insert a card into a loose zone at the top or bottom (default bottom). */
export function insertCard(
  player: PlayerState,
  zone: CardZone,
  instance: CardInstance,
  position: ZonePosition = "bottom",
): void {
  const arr = zoneArrayOf(player, zone);
  if (position === "top") arr.unshift(instance);
  else arr.push(instance);
  notifyCardEntered(player, zone, instance);
}

/** Remove the card at `index` from a loose zone; undefined when out of range. */
export function extractCardAt(player: PlayerState, zone: CardZone, index: number): CardInstance | undefined {
  if (index < 0) return undefined;
  return zoneArrayOf(player, zone).splice(index, 1)[0];
}

/** Remove a card from a loose zone by instance id; undefined when absent. */
export function extractCardById(player: PlayerState, zone: CardZone, instanceId: string): CardInstance | undefined {
  const arr = zoneArrayOf(player, zone);
  const index = arr.findIndex((card) => card.instanceId === instanceId);
  if (index === -1) return undefined;
  return arr.splice(index, 1)[0];
}

/** Take the top card (index 0) off an ordered zone; undefined when empty. */
export function takeTop(player: PlayerState, zone: CardZone): CardInstance | undefined {
  return zoneArrayOf(player, zone).shift();
}

/** Take the bottom card off an ordered zone; undefined when empty. */
export function takeBottom(player: PlayerState, zone: CardZone): CardInstance | undefined {
  return zoneArrayOf(player, zone).pop();
}

/** Empty a loose zone, returning the removed cards in order. */
export function clearZone(player: PlayerState, zone: CardZone): CardInstance[] {
  const arr = zoneArrayOf(player, zone);
  return arr.splice(0, arr.length);
}

/**
 * Replace a loose zone's contents with `instances` without swapping the ArraySchema
 * instance (Colyseus StateView tracking requires the same array — see setup.loadDeckInto).
 */
export function fillZone(player: PlayerState, zone: CardZone, instances: CardInstance[]): void {
  const arr = zoneArrayOf(player, zone);
  arr.splice(0, arr.length);
  for (const instance of instances) arr.push(instance);
  // Notified after every push: `notifyCardEntered` leads to `StateView.add`, which rejects an
  // instance that is not yet attached to the state tree.
  for (const instance of instances) notifyCardEntered(player, zone, instance);
}

/** Add a permanent to a seat's battle area. */
export function placePermanent(player: PlayerState, permanent: Permanent): void {
  player.battleArea.push(permanent);
  adoptPermanent(player, permanent);
}

/**
 * Put a permanent in (or clear) a seat's single breeding slot. The counterpart to
 * `placePermanent` for the raising area, and the other point where a permanent joins the
 * state tree — so it carries the same `adoptPermanent` announcement.
 */
export function setBreeding(player: PlayerState, permanent: Permanent | undefined): void {
  player.breeding = permanent;
  if (permanent !== undefined) adoptPermanent(player, permanent);
}

/**
 * Replace a permanent's top card (a digivolve, or a promotion after the top is peeled off).
 * The displaced card is the caller's to place — this only writes the field.
 */
export function setTopCard(permanent: Permanent, card: CardInstance): void {
  permanent.topCard = card;
  notifyPermanentCard(permanent, card);
}

/** Add a card to the digivolution stack directly beneath the top card. */
export function pushOnStack(permanent: Permanent, card: CardInstance): void {
  permanent.stack.push(card);
  notifyPermanentCard(permanent, card);
}

/** Add a card to the BOTTOM of the digivolution stack. */
export function unshiftOnStack(permanent: Permanent, card: CardInstance): void {
  permanent.stack.unshift(card);
  notifyPermanentCard(permanent, card);
}

/** Take the card directly beneath the top card off the stack; undefined when the stack is empty. */
export function popFromStack(permanent: Permanent): CardInstance | undefined {
  return permanent.stack.pop();
}

/** Remove the stack card at `index`; undefined when out of range. */
export function removeFromStackAt(permanent: Permanent, index: number): CardInstance | undefined {
  if (index < 0) return undefined;
  return permanent.stack.splice(index, 1)[0];
}

/** Replace the whole digivolution stack, bottom-first. */
export function replaceStack(permanent: Permanent, cards: readonly CardInstance[]): void {
  permanent.stack.splice(0, permanent.stack.length, ...cards);
  for (const card of cards) notifyPermanentCard(permanent, card);
}

/**
 * Attach a linked card (＜Link＞) to a permanent. Defaults to "top" — the front of the list,
 * which is where the ＜Link＞ primitive puts a newly linked card; scenario setup that lists
 * linked cards in board order passes "bottom" to keep the written order.
 */
export function linkCard(permanent: Permanent, card: CardInstance, position: ZonePosition = "top"): void {
  if (position === "top") permanent.linked.unshift(card);
  else permanent.linked.push(card);
  notifyPermanentCard(permanent, card);
}

/**
 * Set (or clear) the Option card resolving between activation and resolution of its 1st [Main]
 * effect — §9-1-4's "in no area" slot on PlayerState. Public: the card was revealed to be used.
 */
export function setResolvingOption(player: PlayerState, card: CardInstance | undefined): void {
  player.resolvingOption = card;
  if (card !== undefined) (player as PortHost)[VISIBILITY_PORT]?.(player.seat, Zone.BattleArea, card);
}

/** Remove the permanent at `index` from a seat's battle area; undefined when out of range. */
export function extractPermanentAt(player: PlayerState, index: number): Permanent | undefined {
  if (index < 0) return undefined;
  return player.battleArea.splice(index, 1)[0];
}

/** Empty a seat's battle area, returning the removed permanents in order. */
export function clearBattleArea(player: PlayerState): Permanent[] {
  return player.battleArea.splice(0, player.battleArea.length);
}

/**
 * Read/mutate helpers over the authoritative GameState that the combat modules
 * (and, later, other actions) need before the full effect-primitives layer
 * exists (card-module contract, item 3: implement inline against state
 * reads when a shared primitive is not yet available).
 *
 * Everything here is server-authoritative and free of presentation concerns. The
 * methods are deliberately small and side-effect-explicit so they are easy to
 * unit test and so the combat state machine reads like the source
 * documented behavior without the presentation component noise.
 */
/** Find a permanent in a single player's battle area or breeding slot, or undefined. */
export function findPermanentInPlayer(player: PlayerState, permanentId: string): Permanent | undefined {
  for (const permanent of player.battleArea) {
    if (permanent.permanentId === permanentId) {
      return permanent;
    }
  }
  if (player.breeding !== undefined && player.breeding.permanentId === permanentId) {
    return player.breeding;
  }
  return undefined;
}

/**
 * Find a permanent anywhere on the board — either player's battle area OR
 * breeding slot — by id, or undefined. The single shared lookup every
 * subsystem's local `permanentById`/`findPermanent` duplicate should route
 * through (see GameStateAccess.permanentById below).
 */
export function findPermanentInState(state: GameState, permanentId: string): Permanent | undefined {
  for (const player of state.players) {
    const found = findPermanentInPlayer(player, permanentId);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

/**
 * `<Overflow>`'s per-card memory value (Comprehensive Rules §4-18-1): the ACE Digimon's
 * printed overflow amount, or undefined for a card that isn't an Overflow ACE. Reads the
 * static card definition, never the moving `CardInstance` (Overflow is a printed rule, not
 * per-instance state).
 */
function overflowValueOf(card: CardInstance): number | undefined {
  const def = getCardDefinition(card.cardId);
  return def?.isAce === true ? def.overflowMemory : undefined;
}

/**
 * Process `<Overflow>` (Comprehensive Rules §4-18) for cards that just moved from the field,
 * or from under a card, to another area. Call this — and ONLY this — at a genuine leave: never
 * on a card entering the field (§4-18-3) or landing under a card (§4-18-4).
 *
 * Each Overflow ACE card among `cards` costs its OWNER (never `state.turnSeat`) its printed
 * overflow amount: the printed value is a positive magnitude ("Overflow -N) ... lose N
 * memory)"), so it is applied as a LOSS via `MemoryGauge.addMemoryForSeat(owner, -value, ...)`
 * — Overflow only ever takes memory away from the ACE's own controller, regardless of whose
 * turn it is. `memory` is optional so call sites that construct a `GameStateAccess` without a
 * gauge (most unit tests) simply skip Overflow rather than throwing.
 *
 * §4-18-5 (simultaneous instances): the turn player's instances are processed first (4-18-5-1),
 * then the non-turn player's (4-18-5-2) — `turnSeat` orders the batch that way. Because the
 * gauge clamps at MEMORY_MIN/MAX, cross-seat order can change the final value, so this ordering
 * is load-bearing, not cosmetic. WITHIN one player's own simultaneous instances, 4-18-5-1/5-2
 * grant that player a free choice of which to resolve first; the engine has no decision seam for
 * "pick one of your own pending Overflow instances" (unlike e.g. `runEvadeDecision`), so same-seat
 * ties are processed in a fixed (array) order instead of offering that choice — a knowingly
 * incomplete model of the free-choice sub-clause, not a magnitude/direction bug.
 */
export function applyOverflow(
  memory: OverflowMemoryPort | undefined,
  cards: readonly CardInstance[],
  turnSeat?: Seat,
): void {
  if (memory === undefined) return;
  const ordered =
    turnSeat === undefined
      ? cards
      : [...cards].sort((a, b) => Number(b.ownerSeat === turnSeat) - Number(a.ownerSeat === turnSeat));
  for (const card of ordered) {
    const value = overflowValueOf(card);
    if (value === undefined || value === 0) continue;
    // Charges `card.ownerSeat`. §4-10-2 defines the rules' "owner" as the CONTROLLER
    // ("the player that is currently using that card"), not deck-owner. The engine has no
    // control-changing effect today (`controllerSeat` is assigned once at creation), so
    // ownerSeat and controllerSeat always coincide; this only diverges if one is ever added.
    memory.addMemoryForSeat(card.ownerSeat, -value, "overflow");
  }
}

export class GameStateAccess {
  constructor(
    private readonly state: GameState,
    private readonly memory?: OverflowMemoryPort,
    private readonly emit?: EventPort,
  ) {}

  get game(): GameState {
    return this.state;
  }

  /** The two seats are always 0 and 1; the opponent is the other one. */
  opponentOf(seat: Seat): Seat {
    return (seat === 0 ? 1 : 0) as Seat;
  }

  player(seat: Seat): PlayerState {
    const player = this.state.players[seat];
    if (player === undefined) {
      throw new Error(`No player seated at ${seat}`);
    }
    return player;
  }

  /** Find a permanent (in either player's battle area OR breeding slot) by id, or undefined. */
  permanentById(permanentId: string): Permanent | undefined {
    return findPermanentInState(this.state, permanentId);
  }

  /** Locate which seat's battle area a permanent sits in (its controller). */
  controllerOf(permanent: Permanent): Seat {
    return permanent.controllerSeat;
  }

  /**
   * Whether a permanent is currently a Digimon in a battle area. Mirrors the
   * combined source guards the effect runtime.IsPermanentExistsOnBattleArea +
   * Permanent.IsDigimon (face-up Digimon/DigiEgg). When a `reader` with
   * `grantedKinds` is supplied, a Tamer permanent granted Digimon kind via a
   * continuous KindGrant is also recognized as a Digimon for combat/legality
   * purposes (HARD-01).
   */
  isBattleAreaDigimon(
    permanent: Permanent | undefined,
    reader?: { grantedKinds?(permanentId: string): CardKind[] },
  ): boolean {
    if (permanent === undefined || permanent.topCard === undefined) {
      return false;
    }
    if (this.permanentById(permanent.permanentId) === undefined) {
      return false; // not (or no longer) on a battle area
    }
    if (permanent.inBreeding) {
      return false;
    }
    if (this.isDigimonCard(permanent.topCard)) return true;
    // Continuous "treat as Digimon" grant: when a KindGrant confers Digimon kind
    // onto a non-Digimon permanent (e.g., Tamer), the effective kind makes it a
    // Digimon for combat/legality purposes (HARD-01).
    if (reader?.grantedKinds) {
      const granted = reader.grantedKinds(permanent.permanentId);
      if (granted.includes(CardKind.Digimon) || granted.includes(CardKind.DigiEgg)) return true;
    }
    return false;
  }

  /** A face-up CardInstance whose definition is a Digimon (or DigiEgg). */
  isDigimonCard(card: CardInstance): boolean {
    if (!card.faceUp) {
      return false;
    }
    const def = getCardDefinition(card.cardId);
    if (def === undefined) {
      return false;
    }
    return def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.DigiEgg);
  }

  suspend(permanent: Permanent): void {
    permanent.isSuspended = true;
  }

  unsuspend(permanent: Permanent): void {
    permanent.isSuspended = false;
  }

  /**
   * Remove a permanent from its controller's battle area OR breeding slot and move its top
   * card, digivolution stack, and linked cards to their owners' trash, WITHOUT processing
   * <Overflow> — the caller applies Overflow itself. Factored out of {@link deletePermanent}
   * so a caller deleting SEVERAL permanents in one simultaneous action (e.g. `primitives.ts`'s
   * `deletePermanent`) can collect every leaving card across the whole batch first and apply
   * Overflow ONCE, turn-player-first (CR §4-18-5), instead of once per permanent in whatever
   * order the batch happens to be processed. Returns the leaving `CardInstance`s (not yet
   * Overflow-charged) so the caller can batch them, together with the field zone they left
   * so the narration can tell a battle-area deletion from a breeding one.
   */
  private moveDeletedPermanentCardsToTrash(permanentId: string): DeletionMove {
    for (const player of this.state.players) {
      const index = player.battleArea.findIndex((p) => p.permanentId === permanentId);
      const permanent = index >= 0 ? player.battleArea[index] : undefined;
      const inBreeding = permanent === undefined && player.breeding?.permanentId === permanentId;
      const target = permanent ?? (inBreeding ? player.breeding : undefined);
      if (target === undefined) {
        continue;
      }
      const cards: CardInstance[] = [...target.stack, ...(target.topCard ? [target.topCard] : []), ...target.linked];
      for (const card of cards) {
        // CR §4-20-5: a token leaving the field is removed from the game instead of trashed —
        // dropping it here (inserting into no zone) is that removal; every other leaving card
        // still routes to its owner's trash.
        const def = getCardDefinition(card.cardId);
        if (def !== undefined && isTokenDefinition(def)) {
          continue;
        }
        insertCard(this.player(card.ownerSeat), Zone.Trash, card);
      }
      if (inBreeding) {
        player.breeding = undefined;
      } else {
        extractPermanentAt(player, index);
      }
      return { cards, from: inBreeding ? Zone.Breeding : Zone.BattleArea };
    }
    return { cards: [], from: Zone.BattleArea };
  }

  /**
   * Narrate a deletion as one `cardsMoved` per origin zone across the whole batch. Grouping
   * here rather than per permanent keeps a simultaneous deletion one notice on the client
   * instead of one per Digimon, and this is the only place a deletion is narrated: every
   * deletion path in the engine — a battle death, a rule process, an effect — moves its cards
   * through this class, so callers add no `cardsMoved` of their own.
   */
  private narrateDeletion(moves: readonly DeletionMove[]): void {
    if (this.emit === undefined) return;
    for (const from of [Zone.BattleArea, Zone.Breeding] as const) {
      const instanceIds = moves
        .filter((move) => move.from === from)
        .flatMap((move) => move.cards.map((card) => card.instanceId));
      if (instanceIds.length > 0) this.emit({ kind: "cardsMoved", instanceIds, from, to: Zone.Trash });
    }
  }

  /**
   * Remove a permanent from its controller's battle area OR breeding slot (CR §3-4-4: the
   * field is divided into the breeding area and the battle area), sending the top card, the
   * whole digivolution stack, and any linked cards to their owners' trash. Mirrors the net
   * effect of rule implementation.Destroy for the core loop (deletion timing/replacement
   * effects are layered in by later subsystems).
   *
   * Returns the instance ids that were moved to trash so callers can narrate.
   */
  deletePermanent(permanentId: string): string[] {
    const move = this.moveDeletedPermanentCardsToTrash(permanentId);
    const cards = move.cards;
    // <Overflow> (CR §4-18): every card here just left the field (topCard), or left from
    // under a card (stack/linked), for the trash — a genuine leave. This is the single
    // chokepoint for every SINGLE-permanent deletion (combat, security-check, rule, and
    // effect-driven mostly route through this method), so it is the complete deletion-side
    // <Overflow> seam for a one-at-a-time delete. A caller deleting several permanents in one
    // simultaneous batch should use {@link deletePermanentsBatched} instead, so Overflow is
    // sorted turn-player-first ONCE across the whole batch (CR §4-18-5) rather than once per
    // permanent in call order.
    applyOverflow(this.memory, cards, this.state.turnSeat);
    this.narrateDeletion([move]);
    return cards.map((c) => c.instanceId);
  }

  /**
   * Delete several permanents as ONE simultaneous action (CR §4-18-5: "when multiple
   * instances of <Overflow> are processed simultaneously..."). Moves every permanent's cards
   * to trash first, then applies <Overflow> ONCE over the combined set, sorted turn-player-
   * first — as opposed to calling {@link deletePermanent} once per id, which would apply each
   * permanent's Overflow immediately in caller-supplied order and could cross the turn-player/
   * non-turn-player boundary in the wrong direction, changing the clamped result (the memory
   * gauge clamps at ±10). Returns each permanent id's moved instance ids (empty for an id that
   * was not found / already off the field), in the SAME order as `permanentIds`.
   */
  deletePermanentsBatched(permanentIds: readonly string[]): string[][] {
    const perPermanent = permanentIds.map((id) => this.moveDeletedPermanentCardsToTrash(id));
    const allCards = perPermanent.flatMap((move) => move.cards);
    applyOverflow(this.memory, allCards, this.state.turnSeat);
    this.narrateDeletion(perPermanent);
    return perPermanent.map((move) => move.cards.map((c) => c.instanceId));
  }

  /**
   * Move the top security card (index 0) of `seat` to that player's trash and
   * return it. Undefined when the security stack is empty. This is the minimal
   * security movement combat needs; full security resolution (Security effects,
   * OnSecurityCheck triggers, multi-card Strike) is the security-and-win-check
   * subsystem.
   */
  flipTopSecurityToTrash(seat: Seat): CardInstance | undefined {
    const player = this.player(seat);
    const card = takeTop(player, Zone.Security);
    if (card === undefined) {
      return undefined;
    }
    card.faceUp = true;
    insertCard(player, Zone.Trash, card);
    return card;
  }

  securityCount(seat: Seat): number {
    return this.player(seat).security.length;
  }

  /** All battle-area permanents controlled by `seat`. */
  battleAreaPermanents(seat: Seat): Permanent[] {
    return [...this.player(seat).battleArea];
  }

  zoneOfPermanent(permanent: Permanent): Zone {
    return permanent.inBreeding ? Zone.Breeding : Zone.BattleArea;
  }
}
