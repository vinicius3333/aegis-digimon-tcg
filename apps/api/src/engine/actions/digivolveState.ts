import { CardInstance, Zone, type GameState, type PlayerState, type Permanent, type Seat } from "@aegis/shared";
import { extractCardAt, findPermanentInPlayer, pushOnStack, setTopCard } from "../state/access.js";

/**
 * Small, pure, source-faithful state helpers the digivolve action composes from
 * (subsystem: digivolve; sources: documented behavior, documented behavior, documented behavior).
 *
 * These are intentionally narrow: just the reads/mutations digivolve needs that
 * are not yet owned by another subsystem's module. Anything broader (the full
 * memory gauge convention, generic primitives, the effect stack) stays in its own
 * subsystem; digivolve receives those via injected dependencies (see DigivolveDeps
 * in digivolve.ts) so it neither duplicates nor pre-empts them.
 */

/** The seat opposing `seat` (source Player.Enemy). */
export function opponentOf(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

/** The PlayerState for a seat. `state.players` is indexed by seat (index === seat). */
export function playerAt(state: GameState, seat: Seat): PlayerState | undefined {
  return state.players[seat];
}

/** Find a battle-area Permanent by id for a given player. */
export function findBattleAreaPermanent(player: PlayerState, permanentId: string): Permanent | undefined {
  return player.battleArea.find((p) => p.permanentId === permanentId);
}

/**
 * Find a Permanent owned by the player in either the battle area or the
 * breeding area. Digivolve is legal on both targets during the Main phase.
 */
export function findOwnedPermanent(player: PlayerState, permanentId: string): Permanent | undefined {
  return findPermanentInPlayer(player, permanentId);
}

/**
 * Locate a card instance in a seat's hand and report its index, or undefined when
 * it is not there. Digivolve sources the higher-level card from hand (the
 * `digivolve` intent in API-CONTRACT carries a hand instanceId).
 */
export function findInHand(
  player: PlayerState,
  instanceId: string,
): { instance: CardInstance; index: number } | undefined {
  const index = player.hand.findIndex((c) => c.instanceId === instanceId);
  if (index < 0) return undefined;
  const instance = player.hand[index];
  if (instance === undefined) return undefined;
  return { instance, index };
}

/** Where a given instance currently lives for its owner, or undefined if nowhere obvious. */
export function zoneOfInstance(player: PlayerState, instanceId: string): Zone | undefined {
  if (player.hand.some((c) => c.instanceId === instanceId)) return Zone.Hand;
  if (player.deck.some((c) => c.instanceId === instanceId)) return Zone.Deck;
  if (player.trash.some((c) => c.instanceId === instanceId)) return Zone.Trash;
  if (player.security.some((c) => c.instanceId === instanceId)) return Zone.Security;
  return undefined;
}

/**
 * Stack the digivolving card onto a permanent, returning the prior top card
 * (the new top's immediate digivolution source).
 *
 * Mirrors the source evolve step in documented behavior (`permanent.AddCardSource(card)`
 * after capturing the base card). In this model a
 * single ordered `cardSources` list is mutated with an Insert(0, card); the Aegis
 * schema splits that into `topCard` + `stack` (stack ordered bottom..just-below-top),
 * so the prior top is appended to the END of `stack` (it becomes the card directly
 * beneath the new top) and the new card becomes `topCard`.
 *
 * Pure with respect to other zones: the caller is responsible for having already
 * removed `newTop` from the hand (digivolve.ts does this) so the instance is not
 * double-counted.
 */
export function pushDigivolution(permanent: Permanent, newTop: CardInstance): CardInstance {
  const priorTop = permanent.topCard;
  pushOnStack(permanent, priorTop);
  // The new top of an in-play permanent is public: flip it face-up. The evolving card
  // comes from a face-down zone (the hand starts face-down — setup.ts), and unless it is
  // flipped here `isDigimonCard(topCard)` is false, so the engine stops recognising the
  // whole permanent as a Digimon (can't attack/block/be targeted).
  newTop.faceUp = true;
  setTopCard(permanent, newTop);
  return priorTop;
}

/** Place the selected App Fusion link above the prior top, preserving all other links. */
export function moveLinkOntoStack(permanent: Permanent, instanceId: string): CardInstance | undefined {
  const index = permanent.linked.findIndex((card) => card.instanceId === instanceId);
  if (index < 0) return undefined;
  const card = permanent.linked.splice(index, 1)[0]!;
  card.faceUp = true;
  pushOnStack(permanent, card);
  return card;
}

/**
 * Remove and return the hand instance at `index` (the digivolving card leaving the
 * hand to become the new top). Splicing keeps the ArraySchema indices consistent
 * for Colyseus delta sync.
 */
export function takeFromHand(player: PlayerState, index: number): CardInstance | undefined {
  return extractCardAt(player, Zone.Hand, index);
}
