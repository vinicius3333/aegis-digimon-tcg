/* The battle two Digimon fight on the board itself. A security check gets the
   centre-stage clash; a battle between permanents plays where the cards stand:
   the arrow extends, the attacker lunges at its target, and the loser takes the
   claw and the shake ahead of its burst.

   The declaration and the `combatResolved` that closes it usually arrive in one
   batch — the server resolves an uncontested attack in a single pass — so nothing
   here reads the live event log the way the tracking arrow does. The open attack
   is remembered event by event instead, and the scene is cut from that memory at
   the moment the combat resolves. */

import type { ServerEvent, Seat } from "@aegis/shared";
import { LungeDirection } from "./match/enums";

/** The attack currently declared and not yet resolved, remembered across batches. */
export interface OpenAttack {
  seat: Seat;
  attackerPermanentId: string;
  attackerCardId: string;
  attackerArtId?: string;
  /** The permanent under attack; null while the attack points at the player. */
  targetPermanentId: string | null;
  /** The target's public identity at declaration; a blocker arrives without one. */
  targetCardId?: string;
  targetArtId?: string;
  /** This battle's clash has already been staged from its deletion; `combatResolved` adds nothing. */
  staged?: true;
}

export interface FieldClashCombatant {
  permanentId: string;
  /** Known from the declaration or the board's last measurement; a ghost without one stays unrendered. */
  cardId?: string;
  artId?: string;
}

/** One board battle, cut from the open attack when its `combatResolved` arrives. */
export interface FieldClashScene {
  /** Increments per battle so a new scene restarts the animations instead of resuming them. */
  key: number;
  attacker: FieldClashCombatant;
  defender: FieldClashCombatant;
  /** Board identities the compare deleted; they take the claw and the shake. */
  loserPermanentIds: readonly string[];
  /** The viewer's attacker leans up the board; the opponent's leans down. */
  direction: LungeDirection;
}

/**
 * Events that end the declared attack. `securityChecked` closes a player attack,
 * `combatResolved` a battle; the turn and phase boundaries are the same backstop
 * the tracking arrow uses, so a memory of a cancelled attack cannot outlive them.
 */
function closesAttack(event: ServerEvent): boolean {
  return (
    event.kind === "combatResolved" ||
    event.kind === "securityChecked" ||
    event.kind === "turnEnded" ||
    event.kind === "phaseChanged"
  );
}

/**
 * The open attack after `event`: a declaration opens one, a block re-points it at
 * the blocker, and anything that ends the attack forgets it.
 */
export function trackOpenAttack(open: OpenAttack | null, event: ServerEvent): OpenAttack | null {
  if (event.kind === "attackDeclared") {
    return {
      seat: event.seat,
      attackerPermanentId: event.attackerPermanentId,
      attackerCardId: event.attackerCardId,
      ...(event.attackerArtId ? { attackerArtId: event.attackerArtId } : {}),
      targetPermanentId: event.target.kind === "permanent" ? event.target.permanentId : null,
      ...(event.targetArtId ? { targetArtId: event.targetArtId } : {}),
      ...(event.targetCardId ? { targetCardId: event.targetCardId } : {}),
    };
  }
  if (event.kind === "blocked" && open) {
    const { targetCardId: _dropped, targetArtId: _droppedArt, ...rest } = open;
    return { ...rest, targetPermanentId: event.blockerPermanentId };
  }
  return closesAttack(event) ? null : open;
}

/**
 * The scene a battle deletion earns, or null when it earns none.
 *
 * `combatResolved` is the honest end-of-attack seam, but the server holds it there: an
 * [On Deletion] trigger that asks its controller a question strands the seam several
 * batches — and a player prompt — behind the blow. Staging from the deletion the battle
 * itself caused puts the clash back where it happened, while the loser is still on the
 * board to take it.
 */
export function buildBattleDeletionScene({
  key,
  open,
  event,
  viewerSeat,
  cardIdOf,
  artIdOf,
}: {
  key: number;
  open: OpenAttack | null;
  event: Extract<ServerEvent, { kind: "cardsMoved" }>;
  viewerSeat: Seat;
  cardIdOf: (permanentId: string) => string | undefined;
  artIdOf?: (permanentId: string) => string | undefined;
}): FieldClashScene | null {
  if (event.battleDeletion !== true) return null;
  if (!open || open.staged || open.targetPermanentId === null) return null;
  const combatants = new Set([open.attackerPermanentId, open.targetPermanentId]);
  const losers = (event.deletedPermanents ?? [])
    .map(({ permanentId }) => permanentId)
    .filter((permanentId) => combatants.has(permanentId));
  if (losers.length === 0) return null;
  return sceneOf({
    key,
    open,
    defenderPermanentId: open.targetPermanentId,
    loserPermanentIds: losers,
    viewerSeat,
    cardIdOf,
    artIdOf,
  });
}

/**
 * The scene a `combatResolved` earns, or null when it earns none: only a battle
 * whose defender is known can be staged, and a player attack that was never
 * blocked resolves through security checks rather than here.
 */
export function buildFieldClashScene({
  key,
  open,
  event,
  viewerSeat,
  cardIdOf,
  artIdOf,
}: {
  key: number;
  open: OpenAttack | null;
  event: Extract<ServerEvent, { kind: "combatResolved" }>;
  viewerSeat: Seat;
  /** The board's last memory of a permanent's top card, for a blocker the declaration never named. */
  cardIdOf: (permanentId: string) => string | undefined;
  artIdOf?: (permanentId: string) => string | undefined;
}): FieldClashScene | null {
  if (!open || open.staged || open.targetPermanentId === null) return null;
  if (open.attackerPermanentId !== event.attackerPermanentId) return null;
  return sceneOf({
    key,
    open,
    defenderPermanentId: open.targetPermanentId,
    loserPermanentIds: event.deletedPermanentIds,
    viewerSeat,
    cardIdOf,
    artIdOf,
  });
}

/** The scene both seams cut, once they agree there is a battle to stage. */
function sceneOf({
  key,
  open,
  defenderPermanentId,
  loserPermanentIds,
  viewerSeat,
  cardIdOf,
  artIdOf,
}: {
  key: number;
  open: OpenAttack;
  /** The open attack's target, already checked to be a permanent by the caller. */
  defenderPermanentId: string;
  loserPermanentIds: readonly string[];
  viewerSeat: Seat;
  cardIdOf: (permanentId: string) => string | undefined;
  artIdOf?: (permanentId: string) => string | undefined;
}): FieldClashScene {
  const attackerArtId = open.attackerArtId ?? artIdOf?.(open.attackerPermanentId);
  const defenderArtId = open.targetArtId ?? artIdOf?.(defenderPermanentId);
  const defenderCardId = open.targetCardId ?? cardIdOf(defenderPermanentId);
  return {
    key,
    attacker: {
      permanentId: open.attackerPermanentId,
      cardId: open.attackerCardId,
      ...(attackerArtId ? { artId: attackerArtId } : {}),
    },
    defender: {
      permanentId: defenderPermanentId,
      ...(defenderCardId ? { cardId: defenderCardId } : {}),
      ...(defenderArtId ? { artId: defenderArtId } : {}),
    },
    loserPermanentIds,
    direction: open.seat === viewerSeat ? LungeDirection.Up : LungeDirection.Down,
  };
}
