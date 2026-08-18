import { EffectDuration, type Seat } from "@aegis/shared";

interface TriggeredSecurityDpModifier {
  seat: Seat;
  delta: number;
  duration: EffectDuration;
}

/** Continuous and turn-scoped DP modifiers applied during a security check battle. */
export class SecurityDpLedger {
  private readonly continuousBySeat = new Map<Seat, number>();
  private triggered: TriggeredSecurityDpModifier[] = [];

  add(seat: Seat, delta: number, opts?: { continuous?: boolean; duration?: EffectDuration }): void {
    if (opts?.continuous === true) {
      this.continuousBySeat.set(seat, (this.continuousBySeat.get(seat) ?? 0) + delta);
      return;
    }
    this.triggered.push({ seat, delta, duration: opts?.duration ?? EffectDuration.UntilEachTurnEnd });
  }

  deltaFor(seat: Seat): number {
    return (
      (this.continuousBySeat.get(seat) ?? 0) +
      this.triggered.filter((modifier) => modifier.seat === seat).reduce((total, modifier) => total + modifier.delta, 0)
    );
  }

  clearContinuous(): void {
    this.continuousBySeat.clear();
  }

  sweepTurnEnd(turnSeat: Seat): void {
    this.triggered = this.triggered.filter((modifier) => {
      if (modifier.duration === EffectDuration.Permanent) return true;
      if (modifier.duration === EffectDuration.UntilOwnerTurnEnd) return modifier.seat !== turnSeat;
      if (modifier.duration === EffectDuration.UntilOpponentTurnEnd) return modifier.seat === turnSeat;
      return false;
    });
  }
}
