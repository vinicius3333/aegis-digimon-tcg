/**
 * A headless second seat for scenario tests: a bare colyseus.js client that
 * joins the real room and sends real intents directly, with no UI mounted at
 * all. Only the protagonist's seat is ever rendered — see
 * the scenario test harness.
 */
import { Client, type Room } from "colyseus.js";
import {
  DECISION_CHANNEL,
  GameState,
  ROOM_TYPE,
  type AttackTarget,
  type DecisionRequest,
  type DecisionResponse,
} from "@aegis/shared";
import type { AegisJoinOptions } from "../../src/net/types";

export interface HeadlessOpponent {
  room: Room<GameState>;
  ready: () => void;
  mulligan: (keep: boolean) => void;
  /** Skip the breeding action, or end the Main phase (and thus the turn) — same
   * `endPhase` intent the real UI sends; the server dispatches on `state.phase`. */
  endPhase: () => void;
  /** Play a card from hand — same `playCard` intent the real UI's action bar sends. */
  playCard: (instanceId: string, targetSlot?: number) => void;
  /** Declare an attack — same `attack` intent the real UI's drag-to-attack gesture sends. */
  attack: (attackerPermanentId: string, target: AttackTarget, vortex?: boolean) => void;
  /** Fires once per incoming decision request addressed to this seat. */
  onDecision: (handler: (req: DecisionRequest) => void) => void;
  respondDecision: (decisionId: string, response: DecisionResponse) => void;
  leave: () => Promise<void>;
}

/** Joins the match as the second (headless) seat and returns raw intent senders. */
export async function joinHeadlessOpponent(endpoint: string, options: AegisJoinOptions): Promise<HeadlessOpponent> {
  const client = new Client(endpoint);
  const room = await client.joinOrCreate<GameState>(ROOM_TYPE, options);

  return {
    room,
    ready: () => room.send("ready", {}),
    mulligan: (keep: boolean) => room.send("mulligan", { keep }),
    endPhase: () => room.send("endPhase", {}),
    playCard: (instanceId: string, targetSlot?: number) => room.send("playCard", { instanceId, targetSlot }),
    attack: (attackerPermanentId: string, target: AttackTarget, vortex?: boolean) =>
      room.send("attack", { attackerPermanentId, target, vortex }),
    onDecision: (handler) => room.onMessage<DecisionRequest>(DECISION_CHANNEL, handler),
    respondDecision: (decisionId, response) =>
      room.send("respondDecision", {
        decisionId,
        response,
      }),
    leave: () => room.leave(),
  };
}
