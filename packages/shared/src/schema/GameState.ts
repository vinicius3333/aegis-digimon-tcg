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

/** The five combat prompt windows the engine can park an attack on. */
export type CombatWindowKind = "block" | "counter" | "alliance" | "evade" | "barrier";

/**
 * The combat prompt window currently awaiting an answer, mirrored into synchronized state.
 *
 * The matching `blockWindowOpened` / `counterWindowOpened` / `alliancePrompt` / `evadePrompt` /
 * `barrierPrompt` events still carry the window for the presentation queue, but a channel
 * message sent while a socket is down is never redelivered — so the fact that a window is open
 * lives here, exactly like {@link PendingDecision}, and survives a reconnect's state sync.
 */
export class CombatWindow extends Schema {
  @type("string") kind: CombatWindowKind = "block";
  @type("uint8") seat!: Seat; // who must answer
  /** Block / Counter: the attacking permanent. Empty for the keyword prompts. */
  @type("string") attackerPermanentId = "";
  /** Alliance / Evade / Barrier: the permanent the prompt is about. Empty otherwise. */
  @type("string") permanentId = "";
  /** Block: eligible blockers. Alliance: eligible allies. Empty otherwise. */
  @type(["string"]) eligiblePermanentIds = new ArraySchema<string>();
  /** Counter: the eligible `{ instanceId, effectKey, description }` entries, JSON-encoded. */
  @type("string") eligibleCountersJson = "";
  /** ＜Collision＞: the block is compulsory, so declining is not offered. */
  @type("boolean") mustBlock = false;
}

/** Stable identity of an open combat window, shared by the server mirror and the client. */
export function combatWindowKey(window: { kind: string; attackerPermanentId: string; permanentId: string }): string {
  return `${window.kind}:${window.attackerPermanentId || window.permanentId}`;
}

/**
 * Top-level synchronized object. Holds the shared memory gauge, the turn/phase
 * cursor, both players, and the current pending decision (if any). Mirrors
 * documented behavior.
 */
export class GameState extends Schema {
  @type("string") matchLogId = "";
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

  @type(CombatWindow) combatWindow?: CombatWindow; // undefined when no combat prompt is open
  /**
   * Revision of this state, incremented once per closed batch of events (see
   * SequencedServerEvent). It pairs a patch with the batch whose mutations it carries,
   * so the client can narrate a batch over the board that batch produced.
   */
  @type("uint32") stateVersion = 0;

  @type("boolean") gameOver = false;
  @type("int8") winnerSeat = -1; // -1 until decided
}
