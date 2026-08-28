import { type GameState, type Seat, type IntentResult, type DecisionResponse } from "@aegis/shared";
import type { WinCheck } from "./security/index.js";
import type { DecisionManager } from "./decisions/index.js";
import type { MainPhaseController } from "./MainPhaseController.js";

/**
 * The non-combat, non-play/digivolve client verbs of the intent protocol
 * (subsystem: intent-protocol-and-room): ready, surrender, endPhase, and
 * respondDecision. Kept in one small, dependency-injected unit so the
 * verb-by-verb logic is unit-testable without standing up the whole GameEngine,
 * and so GameEngine.applyIntent stays a thin dispatch table.
 *
 *   - ready        -> RoomManager.OnClickGetReadyButton / AllPlayerIsReady: each
 *                     seat signals lobby readiness; both ready is the GoToBattleScene
 *                     trigger.
 *   - surrender    -> TurnStateMachine.EndGame(player.Enemy, surrendered: true).
 *   - endPhase     -> the turn player ending their Main phase (TurnStateMachine
 *                     MainPhase `Passed`), or crossing the gauge.
 *   - respondDecision -> OptionalSkill.SetUseOptional / MultipleSkills.SetTargetSkill
 *                     RPC handlers -> Player.QueuePlayerSelection (resumes the awaited
 *                     decision).
 */

/** Everything the router needs from the engine; injected so it never imports transport. */
export interface IntentRouterDeps {
  state: GameState;
  win: WinCheck;
  decisions: DecisionManager;
  mainPhase: MainPhaseController;
  /**
   * Record a seat as lobby-ready; returns whether BOTH seats are now ready (the
   * analogue of RoomManager.AllPlayerIsReady, for deck-and-setup to gate start on).
   */
  markReady(seat: Seat): boolean;
}

/**
 * Lobby ready acknowledgement (analogue of RoomManager.OnClickGetReadyButton +
 * AllPlayerIsReady). Records the seat's readiness; once both seats have sent
 * `ready`, {@link GameEngineHooks.onBothReady} fires (AegisRoom hooks this to
 * `GameEngine.startMatch`). Starting on the second `ready` rather than the second
 * `onJoin` avoids racing the client's asset loading against the mulligan window.
 */
export function handleReady(deps: IntentRouterDeps, seat: Seat): IntentResult {
  if (deps.state.gameOver) return { ok: false, reason: "illegal-target" };
  deps.markReady(seat);
  return { ok: true };
}

/**
 * Surrender: always available (API-CONTRACT section 4). The surrendering seat loses
 * immediately and the opponent wins; any open Main phase / decision is torn down so
 * the turn loop unwinds. Idempotent once the game is over.
 */
export function handleSurrender(deps: IntentRouterDeps, seat: Seat): IntentResult {
  if (deps.state.gameOver) return { ok: false, reason: "illegal-target" };
  deps.win.surrender(seat);
  // Unwind anything the engine was awaiting so the turn loop can observe gameOver.
  deps.decisions.cancel();
  deps.mainPhase.abort();
  return { ok: true };
}

/**
 * End the current phase. In the core slice this is the turn player voluntarily
 * ending their Main phase (advancing Main -> End). The MainPhaseController owns the
 * open Main-phase loop and decides `passed` vs `crossed`; it rejects when the phase
 * is not open for this seat (wrong-phase / not-your-turn).
 *
 * While a decision is open, only respondDecision / surrender are accepted
 * (API-CONTRACT validation contract), so endPhase is gated on no pending decision.
 *
 * `endPhase` also skips the Breeding action window (API-CONTRACT "advance Main ->
 * End (or skip Breeding action)"): `GameEngine.applyIntent` routes `endPhase` to
 * `handleBreedingSkip` when `state.phase === Phase.Breeding`, and to this function
 * otherwise.
 */
export function handleEndPhase(deps: IntentRouterDeps, seat: Seat): IntentResult {
  if (deps.state.gameOver) return { ok: false, reason: "illegal-target" };
  // Gate on the synchronized pendingDecision (the contract's source of truth, which
  // the DecisionManager mirrors) so this matches the play/digivolve validators.
  if (deps.state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (deps.state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };

  const ended = deps.mainPhase.endPhaseRequested(seat);
  return ended ? { ok: true } : { ok: false, reason: "wrong-phase" };
}

/**
 * Answer an open decision (the coroutine replacement; ARCHITECTURE.md section 5).
 * Routed to the DecisionManager, which validates the seat + decisionId + response
 * kind against the in-flight request and resumes the awaiting effect. A mismatch
 * (no open decision, wrong seat, stale/unknown decisionId, or wrong response kind)
 * is rejected without touching state — mirroring the source RPC handlers that
 * ignore a selection queued for the wrong player (documented behavior).
 */
export function handleRespondDecision(
  deps: IntentRouterDeps,
  seat: Seat,
  intent: { decisionId: string; response: DecisionResponse },
): IntentResult {
  const accepted = deps.decisions.respond(seat, intent.decisionId, intent.response);
  return accepted ? { ok: true } : { ok: false, reason: "decision-pending" };
}
