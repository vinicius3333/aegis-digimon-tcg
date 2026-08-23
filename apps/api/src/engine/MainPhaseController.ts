import { Phase, type GameState, type Seat } from "@aegis/shared";
import { type MemoryGauge } from "./MemoryGauge.js";
import type { MainPhaseEnd } from "./TurnStateMachine.js";

/**
 * The interactive Main-phase verb loop (subsystem: intent-protocol-and-room).
 *
 * This is the structural replacement for the source `TurnStateMachine.MainPhase`
 * coroutine. The main phase is an open wait: the turn player's
 * inputs (play / digivolve / attack / activate, raised through network transport RPC handlers
 * like `OnClick_SetPlayCard_RPC`) enqueue `PlayerAction`s that the coroutine
 * dequeues and runs, and the phase exits either when the player presses "End Turn"
 * (`Passed`) or when a paid action pushes the memory gauge across to the opponent
 * (the rulebook turn-pass). All of that UI/coroutine machinery is stripped here.
 *
 * On the server there is no input pump to block on, so the loop is modelled as a
 * single awaited promise:
 *   - `TurnStateMachine.runMainPhase(seat)` calls {@link run}, which `await`s the
 *     end-of-turn signal and reports how the turn ended (`crossed` | `passed`).
 *   - The engine executes each turn-player verb as it arrives (the action modules
 *     mutate authoritative state directly, exactly as the existing play/digivolve
 *     handlers do) and then calls {@link checkTurnEnd}; if the gauge has crossed,
 *     the loop resolves `crossed`.
 *   - An `endPhase` intent from the turn player calls {@link endPhaseRequested},
 *     resolving the loop `passed` (or `crossed` if a paid action already pushed it
 *     over — the player cannot "pass" a turn that has already ended).
 *
 * The controller does not validate or run the verbs themselves (the action modules
 * and `applyIntent` own that); it owns only the lifecycle: when the Main phase is
 * open for which seat, and the single point at which it ends. This keeps it small,
 * pure of transport concerns, and unit-testable in isolation.
 */
export class MainPhaseController {
  /** Resolver for the in-flight Main phase, set while a turn's Main phase is open. */
  private end: ((how: MainPhaseEnd) => void) | undefined;
  private activeSeat: Seat | undefined;

  constructor(
    private readonly state: GameState,
    private readonly memory: MemoryGauge,
    /** Optional fixed threshold retained for isolated callers; production uses live card overrides. */
    private readonly turnEndMinMemory?: number,
  ) {}

  private hasCrossedToOpponent(): boolean {
    return this.memory.hasCrossedToOpponent(this.turnEndMinMemory);
  }

  /** Is the Main phase currently open (awaiting turn-player verbs)? */
  get isOpen(): boolean {
    return this.end !== undefined;
  }

  /** The seat whose Main phase is open, if any. */
  get seat(): Seat | undefined {
    return this.activeSeat;
  }

  /**
   * Open the Main phase for `seat` and resolve when the turn ends. Bound to
   * `TurnStateMachine.runMainPhase`. If the gauge has somehow already crossed when
   * the phase opens (a prior phase's paid effect), it ends immediately as `crossed`
   * with no input — mirroring the documented rules checking the end condition on entry.
   */
  run(seat: Seat): Promise<MainPhaseEnd> {
    if (this.end !== undefined) {
      throw new Error("MainPhaseController.run called while a Main phase is already open");
    }
    this.activeSeat = seat;

    if (this.hasCrossedToOpponent()) {
      this.activeSeat = undefined;
      return Promise.resolve("crossed");
    }

    return new Promise<MainPhaseEnd>((resolve) => {
      this.end = resolve;
    });
  }

  /**
   * Re-check the turn-end condition after a turn-player action mutated the gauge.
   * Called by the engine after each successfully applied Main-phase verb. Ends the
   * turn as `crossed` the moment the gauge reaches the opponent's side (the source
   * post-action `EndTurnCheck`). No-op when the phase is closed or has not crossed.
   */
  checkTurnEnd(): void {
    if (this.end === undefined) return;
    if (this.hasCrossedToOpponent()) {
      this.finish("crossed");
    }
  }

  /**
   * Handle the turn player's voluntary `endPhase`. Resolves the loop `passed`
   * normally, or `crossed` if a paid action already pushed the gauge over (so the
   * End phase applies the right memory rule — no pass-turn +3 when it crossed).
   * Returns true when it ended an open phase for `seat`; false (rejected) otherwise.
   */
  endPhaseRequested(seat: Seat): boolean {
    if (this.end === undefined) return false;
    if (this.activeSeat !== seat) return false;
    if (this.state.phase !== Phase.Main) return false;
    // Refuse to end the turn while a decision is pending — the effect chain that
    // opened it must unwind first or the next timing window will crash trying to
    // create a nested decision (only one decision is allowed at a time).
    if (this.state.pendingDecision !== undefined) return false;

    const how: MainPhaseEnd = this.hasCrossedToOpponent() ? "crossed" : "passed";
    this.finish(how);
    return true;
  }

  /**
   * Abandon an open Main phase (match ended mid-turn: surrender, deck-out, a win
   * declared by an effect). Resolves the loop as `crossed` so the turn machine
   * unwinds without granting a pass-turn bonus; the game-over flag stops the outer
   * loop regardless.
   */
  abort(): void {
    if (this.end !== undefined) {
      this.finish("crossed");
    }
  }

  private finish(how: MainPhaseEnd): void {
    const resolve = this.end;
    this.end = undefined;
    this.activeSeat = undefined;
    resolve?.(how);
  }
}
