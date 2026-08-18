import { Phase, EffectTiming, type GameState, type Seat, type ServerEvent } from "@aegis/shared";
import { MemoryGauge, PASS_TURN_MEMORY } from "./MemoryGauge.js";

/**
 * Outcome of the breeding-phase decision window. Mirrors the two mutually-exclusive
 * actions the documented rules offers in BreedingPhase: hatch a DigiEgg into the raising area, or
 * move the raised Digimon to the battle area. `none` covers "skip / nothing to do".
 */
export type BreedingChoice = "hatch" | "move" | "none";

/**
 * Why the main phase ended, so the End phase can apply the right memory rule.
 *
 * - `crossed`: the gauge already crossed to the opponent during play (a paid action
 *   pushed it over); the turn ends with the gauge as-is.
 * - `passed`: the turn player voluntarily ended their turn while still holding memory
 *   (source `Passed`); the incoming turn player is granted +3 (PASS_TURN_MEMORY).
 */
export type MainPhaseEnd = "crossed" | "passed";

/**
 * Safety bound on §6-6-4 postponement. Nothing in the rules caps how many times an
 * end-of-turn effect may push the memory back, but a pair of effects that each return
 * memory every turn end would otherwise hang the server. Past the bound the turn ends.
 */
const MAX_END_TURN_POSTPONEMENTS = 100;

export interface TurnFlowHooks {
  /** Run the effect stack for a timing window (effect-stack-resolution subsystem). */
  fireTiming(timing: EffectTiming): Promise<void>;

  /**
   * Draw `count` cards for `seat` (effect-primitives subsystem). Resolves to the
   * number actually drawn; fewer than requested means the deck ran out.
   */
  draw(seat: Seat, count: number): Promise<number>; // delegates to drawCards, now async

  /** Number of cards left in a seat's deck, for the deck-out loss check. */
  deckCount(seat: Seat): number;

  /**
   * Unsuspend the turn player's permanents at the start of the Active phase. Returns
   * the affected permanent ids (for the event log). The documented rules unsuspends battle-area
   * permanents the turn player controls (plus any with Reboot) and all raising-area
   * permanents (digivolve subsystem owns Reboot/CanUnsuspend nuances).
   */
  unsuspendForActivePhase(seat: Seat): Promise<string[]>;

  /**
   * Drive the interactive breeding phase: open an input window in which the turn
   * player may perform exactly ONE breeding action (hatch a Digi-Egg, move a Digimon
   * to the battle area) or skip (§6-4-1). The action handlers live in
   * engine/actions/breeding; this hook owns the per-phase window and resolves once an
   * action has been taken or the player skipped. When no action is possible the engine
   * resolves immediately without a client round-trip (§6-4-1-3 "do nothing").
   */
  runBreedingPhase(seat: Seat): Promise<void>;

  /**
   * Drive the interactive main phase: accept the turn player's verbs (play,
   * digivolve, attack, activate, ...) until the turn ends — either because the gauge
   * crossed to the opponent or the player passed. The action handlers themselves live
   * in engine/actions; this hook owns the per-phase input loop and reports how it ended.
   */
  runMainPhase(seat: Seat): Promise<MainPhaseEnd>;

  /** Re-check crossed memory and legal actions after start-of-main effects settle. */
  finalizeMainPhaseEntry?(): void;

  /** Has the match already ended (win check / surrender / deck-out)? Stops the loop. */
  isGameOver(): boolean;

  /** End the match because `loserSeat` must draw from an empty deck (deck-out). */
  declareDeckOutLoss(loserSeat: Seat): void;

  /** Clear duration-scoped effects/modifiers that expire at the given boundary. */
  clearDurations(boundary: DurationBoundary): Promise<void>;
}

/**
 * Boundaries at which the documented rules resets its `Until*Effects` lists. The turn machine only
 * signals the boundary; the static/duration-effect subsystem decides what to drop
 * (source TurnStateMachine.EndPhase / ActivePhase reset blocks).
 */
export type DurationBoundary =
  | "ownerTurnStart"
  | "ownerActivePhaseEnd"
  | "ownerTurnEnd"
  | "opponentTurnEnd"
  | "eachTurnEnd";

const noopHooks: TurnFlowHooks = {
  async fireTiming() {},
  async draw() {
    return 0;
  },
  deckCount() {
    return 0;
  },
  async unsuspendForActivePhase() {
    return [];
  },
  async runBreedingPhase() {},
  async runMainPhase() {
    return "passed";
  },
  finalizeMainPhaseEntry() {},
  isGameOver() {
    return false;
  },
  declareDeckOutLoss() {},
  async clearDurations() {},
};

/**
 * Phase progression Active -> Draw -> Breeding -> Main -> End with turn passing
 * (subsystem: turn-phase-state-machine; source: documented behavior,
 * documented behavior).
 *
 * Ports the source `GameStateMachine` coroutine loop to an async driver:
 *   - `SwitchTurnPlayer()` then ActivePhase, DrawPhase, BreedingPhase, MainPhase,
 *     EndPhase, repeating until the game ends.
 *   - The first player skips their first Draw (source `if (TurnCount != 1)`), tracked
 *     via `GameState.isFirstPlayersFirstTurn`.
 *   - Active-phase unsuspend (source ActivePhase unsuspend block).
 *   - Per-phase timing windows fire through the effect stack: OnStartTurn (Active),
 *     OnStartMainPhase / OnEndMainPhase (Main), OnEndTurn (End).
 *   - The turn ends when the memory gauge crosses to the opponent; a voluntary pass
 *     grants the incoming turn player +3 (MemoryGauge.PASS_TURN_MEMORY).
 *
 * All UI, animation, network transport RPCs, and AI auto-play from the source are stripped; the
 * server is authoritative and clients only supply decisions through the hooks.
 */
export class TurnStateMachine {
  private readonly memory: MemoryGauge;
  private running = false;

  constructor(
    private readonly state: GameState,
    private readonly hooks: TurnFlowHooks = noopHooks,
    memory?: MemoryGauge,
    private readonly emit: (event: ServerEvent) => void = () => {},
  ) {
    this.memory = memory ?? new MemoryGauge(state, emit);
  }

  /**
   * Run the whole game loop until the match ends. The first turn player must already
   * be set on `state.turnSeat` by setup (deck-and-setup subsystem) before this is
   * called; unlike the documented rules it is NOT switched before the first turn.
   *
   * The documented rules switched the turn player at the very top of every loop iteration, including
   * the first, because it initialised `TurnPlayer` to the eventual first player's
   * opponent. Aegis sets `turnSeat` to the actual first player at setup, so the first
   * iteration runs as-is and the switch happens only between turns.
   */
  async run(): Promise<void> {
    if (this.running) {
      throw new Error("TurnStateMachine.run called while already running");
    }
    this.running = true;
    try {
      let firstIteration = true;
      while (!this.hooks.isGameOver()) {
        if (!firstIteration) {
          this.passTurn();
        }
        firstIteration = false;

        await this.runTurn();
      }
    } finally {
      this.running = false;
    }
  }

  /** One full turn: Active -> Draw -> Breeding -> Main -> End. Visible for testing. */
  async runTurn(): Promise<void> {
    await this.activePhase();
    if (this.hooks.isGameOver()) return;

    await this.drawPhase();
    if (this.hooks.isGameOver()) return;

    await this.breedingPhase();
    if (this.hooks.isGameOver()) return;

    let ending = await this.mainPhase();
    if (this.hooks.isGameOver()) return;

    // §6-6-4: an OnEndTurn effect can move the memory back to 0 or more on the turn player's
    // side, which postpones the end of the turn and continues the current phase. Each
    // postponement re-runs the Main phase and re-opens the end-of-turn window.
    for (let postponements = 0; postponements < MAX_END_TURN_POSTPONEMENTS; postponements++) {
      if (!(await this.endTurnWindow(ending))) break;
      if (this.hooks.isGameOver()) return;
      ending = await this.mainPhase();
      if (this.hooks.isGameOver()) return;
    }

    await this.closeTurn();
  }

  // --- Active phase -------------------------------------------------------------
  // source TurnStateMachine.ActivePhase: bump the turn counter, fire OnStartTurn, then
  // unsuspend the turn player's permanents.
  private async activePhase(): Promise<void> {
    this.setPhase(Phase.Active);
    this.state.turnCount += 1;
    await this.hooks.clearDurations("ownerTurnStart");

    await this.hooks.fireTiming(EffectTiming.OnStartTurn);
    if (this.hooks.isGameOver()) return;

    const unsuspended = await this.hooks.unsuspendForActivePhase(this.state.turnSeat);
    for (const permanentId of unsuspended) {
      this.emit({ kind: "cardsMoved", instanceIds: [permanentId], from: "suspended", to: "unsuspended" });
    }

    await this.hooks.clearDurations("ownerActivePhaseEnd");
  }

  // --- Draw phase ---------------------------------------------------------------
  // source TurnStateMachine.DrawPhase: the first player's first turn skips the draw
  // (`if (TurnCount != 1)`); otherwise draw 1, losing on an empty deck.
  private async drawPhase(): Promise<void> {
    this.setPhase(Phase.Draw);

    if (this.state.isFirstPlayersFirstTurn) {
      return; // first player skips the first Draw (rulebook)
    }

    if (this.hooks.deckCount(this.state.turnSeat) === 0) {
      this.hooks.declareDeckOutLoss(this.state.turnSeat);
      return;
    }

    await this.hooks.draw(this.state.turnSeat, 1);
  }

  // --- Breeding phase -----------------------------------------------------------
  // source TurnStateMachine.BreedingPhase: an interactive window in which the turn
  // player takes at most one breeding action (hatch / move) or skips. The engine's
  // hook owns the input loop and resolves when the action is taken or skipped (and
  // immediately when nothing is possible).
  private async breedingPhase(): Promise<void> {
    this.setPhase(Phase.Breeding);
    await this.hooks.runBreedingPhase(this.state.turnSeat);
  }

  // --- Main phase ---------------------------------------------------------------
  // source TurnStateMachine.MainPhase: fire OnStartMainPhase, run the interactive verb
  // loop until the turn ends, then fire OnEndMainPhase (the source `EndMainPhase:` exit).
  private async mainPhase(): Promise<MainPhaseEnd> {
    this.setPhase(Phase.Main);

    // Open the authoritative Main input window before any phase patch can reach a
    // client. `fireTiming` is asynchronous even when no start-of-main effect needs
    // input; opening the controller afterwards left a real interval where the UI
    // showed Main and play validation succeeded, but no controller existed to end
    // the turn when that play crossed memory.
    const endingWindow = this.hooks.runMainPhase(this.state.turnSeat);

    await this.hooks.fireTiming(EffectTiming.OnStartMainPhase);
    if (this.hooks.isGameOver()) {
      return "crossed";
    }
    this.hooks.finalizeMainPhaseEntry?.();

    const ending = await endingWindow;

    await this.hooks.fireTiming(EffectTiming.OnEndMainPhase);
    return ending;
  }

  // --- End phase ----------------------------------------------------------------
  // source turn-end is split across the engine.EndTurnProcess (fires OnEndTurn,
  // applies the pass-turn +/-3) and TurnStateMachine.EndPhase (duration resets,
  // clears isFirstPlayerFirstTurn). Both run here, in source order: the OnEndTurn
  // window fires while the phase is still notionally the turn player's, then the
  // phase flips to End and durations clear.
  private async endTurnWindow(ending: MainPhaseEnd): Promise<boolean> {
    // Voluntary pass while the gauge has not already crossed: the incoming turn
    // player starts with +3 (source EndTurnProcess, which applies this BEFORE OnEndTurn
    // fires). We are still in the outgoing player's frame here, so +3 for the
    // incoming player is -3 (-PASS_TURN_MEMORY) now; passTurn()'s negation flips it to
    // +3 for the incoming player on the next iteration.
    if (ending === "passed" && !this.memory.hasCrossedToOpponent()) {
      this.memory.setMemory(-PASS_TURN_MEMORY, "passTurn");
    }

    // §6-6-4 postponement is a MOVE: the gauge has to have been on the opponent's side
    // going into the window and be back on the turn player's side coming out. Snapshotting
    // it here (after the pass bonus) is what keeps a turn that never crossed at all from
    // postponing itself forever.
    const crossedBeforeWindow = this.memory.hasCrossedToOpponent();

    await this.hooks.fireTiming(EffectTiming.OnEndTurn);
    if (this.hooks.isGameOver()) return false;

    return crossedBeforeWindow && !this.memory.hasCrossedToOpponent();
  }

  private async closeTurn(): Promise<void> {
    this.setPhase(Phase.End);
    this.state.isFirstPlayersFirstTurn = false;

    await this.hooks.clearDurations("eachTurnEnd");
    await this.hooks.clearDurations("ownerTurnEnd");
    await this.hooks.clearDurations("opponentTurnEnd");

    this.emit({
      kind: "turnEnded",
      endingSeat: this.state.turnSeat,
      nextSeat: (1 - this.state.turnSeat) as Seat,
      turnCount: this.state.turnCount,
    });
  }

  /**
   * Hand the turn to the opponent (source GameContext.SwitchTurnPlayer). Memory is
   * stored turn-relative, so flipping the active seat negates the gauge to keep it in
   * the new turn player's frame.
   */
  private passTurn(): void {
    const next = (1 - this.state.turnSeat) as Seat;
    this.state.turnSeat = next;
    this.state.memory = -this.state.memory; // re-frame the gauge for the new turn player
  }

  private setPhase(phase: Phase): void {
    this.state.phase = phase;
    this.emit({
      kind: "phaseChanged",
      phase,
      turnSeat: this.state.turnSeat,
      turnCount: this.state.turnCount,
    });
  }
}
