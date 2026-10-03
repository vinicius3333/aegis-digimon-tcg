import { type GameState, type Seat, matchTimerSettings, type MatchTimerOptions } from "@aegis/shared";

/** Server monotonic-time accounting. Client animation reports cannot extend a pause. */
export class MatchClock {
  private remaining: [number, number];
  private lastTime: number;
  private runningSeat: Seat | undefined;
  private pauseUntil = 0;
  private lastTurn = 0;

  constructor(
    private readonly state: GameState,
    options: Partial<MatchTimerOptions>,
    privateRoom: boolean,
    now: number,
  ) {
    const settings = matchTimerSettings(options, privateRoom);
    state.matchTimer = settings.enabled;
    state.timerStartSeconds = settings.startSeconds;
    state.timerRefillSeconds = settings.refillSeconds;
    this.remaining = [settings.startSeconds * 1000, settings.startSeconds * 1000];
    this.lastTime = now;
    this.publish();
  }

  /** Charge the previous owner before changing turns/owners or accepting a late answer. */
  update(now: number, inputSeat: Seat | undefined): Seat | undefined {
    if (!this.state.matchTimer || this.state.gameOver) {
      this.runningSeat = undefined;
      this.state.timerActiveSeat = -1;
      this.lastTime = now;
      return;
    }
    const chargedSeat = this.runningSeat;
    if (chargedSeat !== undefined) {
      const elapsed = Math.max(0, now - Math.max(this.lastTime, this.pauseUntil));
      this.remaining[chargedSeat] = Math.max(0, this.remaining[chargedSeat] - elapsed);
    }
    this.lastTime = now;
    // Expiry wins over a turn refill or an answer arriving at the deadline.
    if (chargedSeat !== undefined && this.remaining[chargedSeat] === 0) {
      this.runningSeat = undefined;
      this.publish();
      this.state.timerActiveSeat = -1;
      return chargedSeat;
    }
    if (this.state.turnCount > this.lastTurn) {
      // The opening turn starts with the full bank. Subsequent turns refill their owner.
      if (this.lastTurn > 0) {
        const seat = this.state.turnSeat;
        this.remaining[seat] = Math.min(
          this.state.timerStartSeconds * 1000,
          this.remaining[seat] + this.state.timerRefillSeconds * 1000,
        );
      }
      this.lastTurn = this.state.turnCount;
    }
    this.runningSeat = inputSeat;
    this.publish();
    this.state.timerActiveSeat = inputSeat !== undefined && now >= this.pauseUntil ? inputSeat : -1;
  }

  /** A fixed server-granted grace period for the just-published animation batch. */
  pauseForPresentation(now: number): void {
    this.pauseUntil = now + 2000;
    this.state.timerActiveSeat = -1;
  }

  private publish(): void {
    this.state.timerRemaining0 = Math.ceil(this.remaining[0] / 1000);
    this.state.timerRemaining1 = Math.ceil(this.remaining[1] / 1000);
  }
}
