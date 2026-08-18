import { Phase, type GameState, type Seat } from "@aegis/shared";

/**
 * The interactive Breeding-phase window (subsystem: deck-and-setup / breeding).
 *
 * Structural sibling of {@link import("./MainPhaseController.js").MainPhaseController}.
 * During the breeding phase the turn player may take exactly ONE action — hatch a
 * Digi-Egg, move a Digimon to the battle area, or do nothing (Comprehensive Rules
 * §6-4-1) — and then the phase ends. There is no input pump to block on, so the
 * window is modelled as a single awaited promise:
 *
 *   - {@link TurnStateMachine.runBreedingPhase} calls {@link run}, which resolves when
 *     the player has taken an action or skipped.
 *   - The engine applies a breeding verb (hatchEgg / moveFromBreeding) as it arrives
 *     and then calls {@link actionTaken}, ending the window.
 *   - An `endPhase` intent during breeding (or no possible action at all) calls
 *     {@link skip}, ending the window with no action.
 *
 * The controller owns only the lifecycle (when the breeding window is open and the
 * single point it ends); the action modules and `applyIntent` own validating and
 * applying the verbs.
 */
export class BreedingPhaseController {
  private end: (() => void) | undefined;
  private activeSeat: Seat | undefined;

  constructor(private readonly state: GameState) {}

  /** Is the breeding window currently open (awaiting an action or skip)? */
  get isOpen(): boolean {
    return this.end !== undefined;
  }

  /** The seat whose breeding window is open, if any. */
  get seat(): Seat | undefined {
    return this.activeSeat;
  }

  /**
   * Open the breeding window for `seat`. If `autoSkip` is true (no legal breeding
   * action is available), resolve immediately with no window — §6-4-1-3 "do nothing"
   * needs no client round-trip.
   */
  run(seat: Seat, autoSkip: boolean): Promise<void> {
    if (this.end !== undefined) {
      throw new Error("BreedingPhaseController.run called while a breeding phase is already open");
    }
    if (autoSkip) return Promise.resolve();
    this.activeSeat = seat;
    return new Promise<void>((resolve) => {
      this.end = resolve;
    });
  }

  /**
   * End the window because the turn player took their one breeding action. Returns
   * true when it closed an open window for `seat`; false otherwise.
   */
  actionTaken(seat: Seat): boolean {
    if (this.end === undefined) return false;
    if (this.activeSeat !== seat) return false;
    if (this.state.phase !== Phase.Breeding) return false;
    this.finish();
    return true;
  }

  /**
   * End the window because the turn player chose to do nothing (their `endPhase`
   * during breeding). Returns true when it closed an open window for `seat`.
   */
  skip(seat: Seat): boolean {
    if (this.end === undefined) return false;
    if (this.activeSeat !== seat) return false;
    if (this.state.phase !== Phase.Breeding) return false;
    this.finish();
    return true;
  }

  /** Abandon an open window (match ended mid-phase) so the turn machine unwinds. */
  abort(): void {
    if (this.end !== undefined) this.finish();
  }

  private finish(): void {
    const resolve = this.end;
    this.end = undefined;
    this.activeSeat = undefined;
    resolve?.();
  }
}
