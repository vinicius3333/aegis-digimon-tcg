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
 *     and then calls {@link actionTaken} with the promise of the triggers that action
 *     fired. The action is spent at once (no second breeding verb is accepted) but the
 *     window only ends once those triggers have settled, so the turn machine cannot
 *     open Main — and fire [Start of Your Main Phase] — while a "when one of your
 *     Digimon moves from the breeding area" watcher (BT16-082) is still resolving.
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
  private actionSpent = false;

  constructor(private readonly state: GameState) {}

  /** Is the breeding window currently open (awaiting an action or skip)? */
  get isOpen(): boolean {
    return this.end !== undefined;
  }

  /** Has the open window's single breeding action already been taken (triggers may still be settling)? */
  get isActionSpent(): boolean {
    return this.end !== undefined && this.actionSpent;
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
   * Spend the window's one breeding action. The window ends at once, or — when the action
   * fired triggers — only after `triggersSettled` resolves. Returns true when it claimed an
   * open, unspent window for `seat`; false otherwise.
   */
  actionTaken(seat: Seat, triggersSettled?: Promise<void>): boolean {
    if (this.end === undefined) return false;
    if (this.activeSeat !== seat) return false;
    if (this.state.phase !== Phase.Breeding) return false;
    if (this.actionSpent) return false;
    if (triggersSettled === undefined) {
      this.finish();
      return true;
    }
    this.actionSpent = true;
    void triggersSettled.finally(() => this.finish());
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
    if (this.actionSpent) return false;
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
    this.actionSpent = false;
    resolve?.();
  }
}
