import { Schema, ArraySchema, type, view } from "@colyseus/schema";
import { PlayerState } from "./PlayerState.js";
import { Phase } from "./enums.js";
import type { Seat } from "./enums.js";

/** View tag for decision details that are private to the responding seat. */
export const PRIVATE_DECISION_VIEW_TAG = 1;

/**
 * An open request for player input raised by the effect engine. While set, only a
 * matching respondDecision (or surrender) intent is accepted (see API-CONTRACT
 * intent validation contract).
 */
export class PendingDecision extends Schema {
  @type("string") decisionId!: string;
  @type("uint8") seat!: Seat; // who must respond
  @type("string") kind!: string; // "chooseTargets" | "optional" | "orderTriggers" | "selectCards" | "mulligan" | "coinToss"
  @type("string") promptText = "";
  // Candidate identities can expose private hand/deck/security information. The server view
  // unlocks this field only for `seat`; opponents still receive the public waiting metadata.
  @view(PRIVATE_DECISION_VIEW_TAG) @type("string") payloadJson = "";
}

/**
 * Top-level synchronized object. Holds the shared memory gauge, the turn/phase
 * cursor, both players, and the current pending decision (if any). Mirrors
 * documented behavior.
 */
export class GameState extends Schema {
  @type("string") matchId = "";
  @type("string") roomCode = ""; // set for private rooms, empty for public
  @type("string") phase: Phase = Phase.None;
  @type("uint32") turnCount = 0;
  @type("uint8") turnSeat: Seat = 0; // active player
  @type("boolean") isFirstPlayersFirstTurn = true; // first player skips first Draw (rulebook)

  // Single shared memory gauge. Convention: positive favors turnSeat; crossing to
  // the opponent's side ends the turn (see TurnStateMachine). Clamped [-10, 10].
  @type("int8") memory = 0;

  @type([PlayerState]) players = new ArraySchema<PlayerState>(); // index === seat

  @type(PendingDecision) pendingDecision?: PendingDecision; // undefined when no decision is open
  @type("boolean") gameOver = false;
  @type("int8") winnerSeat = -1; // -1 until decided
}
