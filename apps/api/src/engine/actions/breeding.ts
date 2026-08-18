import { ArraySchema } from "@colyseus/schema";
import {
  CardInstance,
  Permanent,
  Phase,
  Zone,
  type CardDefinition,
  type GameState,
  type PlayerState,
  type Seat,
} from "@aegis/shared";
import { definitionOf, dpOf } from "../cards/cardData.js";
import { placePermanent as appendPermanent, takeTop } from "../state/access.js";

/**
 * The breeding-phase verbs `hatchEgg` and `moveFromBreeding` (subsystem:
 * deck-and-setup / breeding; source: Comprehensive Rules §6-4 "Breeding Phase",
 * §4-16 "Moving", §4-17 "Hatching a Digi-Egg").
 *
 * During the breeding phase the turn player may perform exactly ONE of: hatch a
 * Digi-Egg, move a Digimon from the breeding area to the battle area, or do nothing
 * (§6-4-1). This module implements the two mutating choices; "do nothing" is just not
 * calling either.
 *
 *   - hatchEgg (§4-17): take the top card of the Digi-Egg deck and place it face-up
 *     in the breeding area. Only when the breeding area is empty and the egg deck is
 *     non-empty.
 *   - moveFromBreeding (§4-16): move the breeding-area Digimon to the battle area.
 *     Only a Digimon WITH DP can be moved (§4-16-2) — a normal freshly hatched Lv.2
 *     Digi-Egg has no DP and must first digivolve. EX2-007 Mother D-Reaper is the
 *     printed-DP exception and can move directly (official Q3276).
 *
 * Server-authoritative and platform-independent. `validate*` mutate nothing; `apply*` mutate
 * only the passed schema instances and forward narration through an optional emit.
 * No memory is spent and nothing is drawn (breeding actions have no memory cost).
 */

export interface HatchEggIntent {
  type: "hatchEgg";
}

export interface MoveFromBreedingIntent {
  type: "moveFromBreeding";
  permanentId: string;
}

/** Stable rejection reasons (subset of the API-CONTRACT intent-validation vocabulary). */
export type BreedingRejection =
  | "not-your-turn"
  | "wrong-phase"
  | "decision-pending"
  | "game-over"
  | "no-such-player"
  | "breeding-occupied" // hatch: a card is already in the breeding area
  | "egg-deck-empty" // hatch: no Digi-Egg to hatch
  | "breeding-empty" // move: nothing in the breeding area
  | "not-movable" // move: the breeding card has no DP
  | "move-prohibited"; // a seat-level "can't move <X>" prohibition forbids this move (RestrictPlay)

/** Events these actions narrate (subset of @aegis/shared ServerEvent). */
export type BreedingEvent =
  | { kind: "hatched"; seat: Seat; cardId: string; permanentId: string }
  | { kind: "movedFromBreeding"; seat: Seat; cardId: string; permanentId: string }
  | { kind: "cardsMoved"; instanceIds: string[]; from: string; to: string };

/** Injected side effects (just narration; breeding has no cost / draw / effect timing). */
export interface BreedingDeps {
  /** Allocate a permanentId unique within the match. */
  nextPermanentId(): string;
  /**
   * Whether a seat-level move prohibition (RestrictPlay mode move/playOrMove, e.g. EX7-014
   * "your opponent can't ... move Digimon with 6000 DP or less") forbids `seat` from moving
   * `definition` out of the breeding area right now. Optional: when absent no move is
   * prohibited. The breeding move is the moving seat's own action, so the prohibition on that
   * seat applies (KB EX7-014 Q3835/Q6509). The engine binds this to the continuous ledger.
   */
  moveProhibited?(state: GameState, seat: Seat, definition: CardDefinition): boolean;
  /** Optional narration hook (server -> client event log). */
  emit?: (event: BreedingEvent) => void;
}

/** What hatch/move produced (for the caller / tests / log). */
export interface BreedingOutcome {
  permanentId: string;
  cardId: string;
}

function gateBreedingPhase(
  state: GameState,
  seat: Seat,
): { ok: false; reason: BreedingRejection } | { ok: true; player: PlayerState } {
  if (state.gameOver) return { ok: false, reason: "game-over" };
  if (state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  if (state.phase !== Phase.Breeding) return { ok: false, reason: "wrong-phase" };
  const player = state.players[seat];
  if (player === undefined) return { ok: false, reason: "no-such-player" };
  return { ok: true, player };
}

/**
 * Validate a hatch: it must be the turn player's breeding phase, no decision open,
 * the breeding area empty (§4-17 "only when there are no Digimon in the breeding
 * area"), and the egg deck non-empty (§4-17-2).
 */
export function validateHatchEgg(
  state: GameState,
  seat: Seat,
): { ok: false; reason: BreedingRejection } | { ok: true; player: PlayerState } {
  const gate = gateBreedingPhase(state, seat);
  if (!gate.ok) return gate;
  const { player } = gate;
  if (player.breeding !== undefined) return { ok: false, reason: "breeding-occupied" };
  if (player.eggDeck.length === 0) return { ok: false, reason: "egg-deck-empty" };
  return { ok: true, player };
}

/**
 * Hatch the top Digi-Egg into the breeding area as a face-up Permanent
 * (`inBreeding = true`). DP is seeded from the egg's definition (0 for a Lv.2
 * Digi-Egg). Returns the new permanent, or a rejection if illegal.
 */
export function applyHatchEgg(
  state: GameState,
  seat: Seat,
  deps: BreedingDeps,
): { ok: false; reason: BreedingRejection } | { ok: true; outcome: BreedingOutcome } {
  const check = validateHatchEgg(state, seat);
  if (!check.ok) return check;
  const { player } = check;

  const egg = takeTop(player, Zone.EggDeck);
  if (egg === undefined) return { ok: false, reason: "egg-deck-empty" }; // unreachable post-validation
  egg.faceUp = true;

  const permanent = new Permanent();
  permanent.permanentId = deps.nextPermanentId();
  permanent.controllerSeat = seat;
  permanent.topCard = egg;
  permanent.stack = new ArraySchema<CardInstance>();
  permanent.linked = new ArraySchema<CardInstance>();
  const dp = dpOf(definitionOf(egg.cardId));
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  permanent.isSuspended = false;
  permanent.inBreeding = true;
  player.breeding = permanent;

  deps.emit?.({ kind: "hatched", seat, cardId: egg.cardId, permanentId: permanent.permanentId });
  deps.emit?.({
    kind: "cardsMoved",
    instanceIds: [egg.instanceId],
    from: Zone.EggDeck,
    to: Zone.Breeding,
  });

  return { ok: true, outcome: { permanentId: permanent.permanentId, cardId: egg.cardId } };
}

/**
 * Validate a move: the turn player's breeding phase, no decision open, a card present
 * in the breeding area, and that card a Digimon WITH DP (§4-16-2). The intent's
 * `permanentId` must match the breeding-area permanent.
 */
export function validateMoveFromBreeding(
  state: GameState,
  seat: Seat,
  intent: MoveFromBreedingIntent,
  deps?: Pick<BreedingDeps, "moveProhibited">,
): { ok: false; reason: BreedingRejection } | { ok: true; player: PlayerState; permanent: Permanent } {
  const gate = gateBreedingPhase(state, seat);
  if (!gate.ok) return gate;
  const { player } = gate;
  const permanent = player.breeding;
  if (permanent === undefined) return { ok: false, reason: "breeding-empty" };
  if (permanent.permanentId !== intent.permanentId) return { ok: false, reason: "breeding-empty" };

  const def = definitionOf(permanent.topCard.cardId);
  // §4-16-2: only a Digimon with DP can be moved. A normal Lv.2 Digi-Egg has
  // no DP, while EX2-007 Mother D-Reaper is the explicit level-less exception:
  // it is a Digi-Egg card that has DP and official Q3276 says it can move.
  if (dpOf(def) <= 0) {
    return { ok: false, reason: "not-movable" };
  }
  // Seat-level move prohibition (RestrictPlay): the moving seat's own action is blocked.
  if (deps?.moveProhibited?.(state, seat, def)) {
    return { ok: false, reason: "move-prohibited" };
  }
  return { ok: true, player, permanent };
}

/**
 * Move the breeding-area Digimon to the battle area (`inBreeding = false`). Returns
 * the moved permanent, or a rejection if illegal.
 */
export function applyMoveFromBreeding(
  state: GameState,
  seat: Seat,
  intent: MoveFromBreedingIntent,
  deps: Pick<BreedingDeps, "emit" | "moveProhibited">,
): { ok: false; reason: BreedingRejection } | { ok: true; outcome: BreedingOutcome } {
  const check = validateMoveFromBreeding(state, seat, intent, deps);
  if (!check.ok) return check;
  const { player, permanent } = check;

  permanent.inBreeding = false;
  player.breeding = undefined;
  appendPermanent(player, permanent);

  deps.emit?.({
    kind: "movedFromBreeding",
    seat,
    permanentId: permanent.permanentId,
    cardId: permanent.topCard.cardId,
  });

  deps.emit?.({
    kind: "cardsMoved",
    instanceIds: [permanent.topCard.instanceId],
    from: Zone.Breeding,
    to: Zone.BattleArea,
  });

  return { ok: true, outcome: { permanentId: permanent.permanentId, cardId: permanent.topCard.cardId } };
}

/**
 * Whether the turn player has any legal breeding action available right now
 * (hatch or move). The engine uses this to decide whether to open the breeding
 * decision window at all (§6-4 "do nothing" is automatic when nothing else is
 * possible, so the loop need not pause for input).
 */
export function canHatch(state: GameState, seat: Seat): boolean {
  return validateHatchEgg(state, seat).ok;
}

export function canMove(state: GameState, seat: Seat): boolean {
  const player = state.players[seat];
  if (player === undefined || player.breeding === undefined) return false;
  return validateMoveFromBreeding(state, seat, {
    type: "moveFromBreeding",
    permanentId: player.breeding.permanentId,
  }).ok;
}
