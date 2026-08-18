import type { GameState, PlayerState, Seat, ServerEvent } from "@aegis/shared";

/**
 * Loss detection and game-end declaration.
 *
 * Subsystem: security-and-win-check (the terminal condition of the game loop).
 * Source:
 *   - documented behavior `SetLose()` / `IsLose`
 *   - documented behavior `EndGame(Winner, Surrendered)` and the Draw-phase
 *     deck-out check (`LibraryCards.Count == 0` => EndGame(opponent))
 *   - documented behavior `DetermineAttackOutcome` (player-directed attack with
 *     Strike >= 1 into empty security => EndGame(attacker owner))
 *   - documented behavior `DoRuleProcess` / `EndGameProcess` (any player IsLose =>
 *     opponent wins; both lost => no winner)
 *
 * Presentation and transport teardown are handled outside this rules module.
 * Here it only mutates authoritative GameState (winnerSeat, gameOver) and emits a
 * `gameOver` event. The room/engine reads `state.gameOver` to stop the loop.
 */

export type GameOverReason = Extract<ServerEvent, { kind: "gameOver" }>["reason"];

/** Why a seat lost. Maps to the gameOver reason of the *winner*. */
export type LossCause = "security" | "deckOut" | "surrender" | "effect";

const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

export class WinCheck {
  constructor(
    private readonly state: GameState,
    private readonly emit: (event: ServerEvent) => void,
  ) {}

  private playerAt(seat: Seat): PlayerState | undefined {
    return this.state.players[seat];
  }

  /**
   * Would `seat` deck-out if forced to draw now? True when their deck is empty.
   * Mirrors the Draw-phase guard `LibraryCards.Count == 0`. The turn state machine
   * skips the very first player's first Draw, so the caller decides *when* a draw
   * is mandatory; this only answers "is the deck empty".
   */
  wouldDeckOut(seat: Seat): boolean {
    const player = this.playerAt(seat);
    return player !== undefined && player.deck.length === 0;
  }

  /** Has the match already ended? Makes declarations idempotent. */
  get isGameOver(): boolean {
    return this.state.gameOver;
  }

  /**
   * Mark a seat as having lost and end the game in the opponent's favor.
   * Analogue of `SetLose()` followed by `EndGame(loser.Enemy)`.
   *
   * Idempotent: once `gameOver` is set (the source guards with its `endGame`
   * flag) further calls are ignored, so simultaneous loss checks cannot overwrite
   * the winner.
   *
   * Consults the WOULD-BE winner's own `lost` flag before declaring them the
   * winner: if they too have already lost (e.g. both decks emptied on the same
   * draw-phase-adjacent check, or a surrender racing an already-lost opponent),
   * this is a simultaneous loss and mirrors `resolveLossFlags`'s draw outcome
   * (gameOver with no winner) instead of crowning a seat that also lost.
   */
  declareLoss(loserSeat: Seat, cause: LossCause): void {
    if (this.state.gameOver) return;
    const loser = this.playerAt(loserSeat);
    if (loser) loser.lost = true;
    console.log(
      `[WinCheck] seat ${loserSeat} lost (cause: ${cause}) — turn ${this.state.turnCount}, phase ${this.state.phase}`,
    );
    const winnerSeat = otherSeat(loserSeat);
    if (this.playerAt(winnerSeat)?.lost === true) {
      this.declareDraw(cause);
      return;
    }
    this.declareWinner(winnerSeat, cause);
  }

  /**
   * End the game declaring `winnerSeat` the winner. First call wins; later calls
   * are no-ops (matches the source `endGame` latch in EndGame()).
   */
  declareWinner(winnerSeat: Seat, reason: GameOverReason): void {
    if (this.state.gameOver) return;
    console.log(
      `[WinCheck] seat ${winnerSeat} wins (reason: ${reason}) — turn ${this.state.turnCount}, phase ${this.state.phase}, memory ${this.state.memory}`,
    );
    this.state.gameOver = true;
    this.state.winnerSeat = winnerSeat;
    this.emit({ kind: "gameOver", result: { outcome: "win", winnerSeat }, reason });
  }

  /**
   * End the game with no winner. `winnerSeat` stays at its -1 sentinel; the
   * ServerEvent carries the draw explicitly so clients don't have to infer it
   * from an absent/invalid seat.
   *
   * Public (not just reachable via `declareLoss`/`resolveLossFlags`'s simultaneous-loss
   * paths) so a fixpoint that can't converge can also resolve the match to a draw —
   * Comprehensive Rules §18-3-2: "If an infinite loop occurs and neither player has the
   * ability to stop it, that game ends in a draw." `reason` is typed to the same
   * `GameOverReason` union as every other declaration; an infinite-loop draw has no
   * dedicated reason value today, so callers use "effect" (the closest existing
   * category: a rule/effect that can't be resolved to a stable state).
   */
  declareDraw(reason: GameOverReason): void {
    if (this.state.gameOver) return;
    console.log(
      `[WinCheck] draw — both seats lost (reason: ${reason}) — turn ${this.state.turnCount}, phase ${this.state.phase}`,
    );
    this.state.gameOver = true;
    this.emit({ kind: "gameOver", result: { outcome: "draw" }, reason });
  }

  /**
   * Surrender: the surrendering seat loses immediately.
   * Source: documented behavior `EndGame(player.Enemy, true)`.
   */
  surrender(seat: Seat): void {
    this.declareLoss(seat, "surrender");
  }

  /**
   * Resolve any pending `lost` flags into a game-over, mirroring
   * documented behavior `EndGameProcess`: if a player is marked lost, their
   * opponent wins; if BOTH are lost, there is no winner (a draw). Returns true
   * when this resolved (or had already resolved) the game.
   *
   * Effects (e.g. cards that call SetLose on the opponent) set `lost` and rely on
   * this sweep to finish the game; `cause` defaults to "effect" for that path.
   */
  resolveLossFlags(cause: LossCause = "effect"): boolean {
    if (this.state.gameOver) return true;

    const seat0Lost = this.playerAt(0)?.lost === true;
    const seat1Lost = this.playerAt(1)?.lost === true;

    if (seat0Lost && seat1Lost) {
      // Both lost simultaneously (e.g. a shared deck-out, or a card effect that
      // makes both players lose): mirrors comprehensive rules 1-2-2/18-3-2 — the
      // game ends with no winner. `winnerSeat` stays at its -1 sentinel.
      this.declareDraw(cause);
      return true;
    }
    if (seat0Lost) {
      this.declareWinner(1, cause);
      return true;
    }
    if (seat1Lost) {
      this.declareWinner(0, cause);
      return true;
    }
    return false;
  }
}
