import type { GameState, Seat } from "@aegis/shared";

interface TurnActivity {
  currentDigimonAttackSeats: Set<Seat>;
  previousDigimonAttackSeats: Set<Seat>;
}

const activityByState = new WeakMap<GameState, TurnActivity>();

function activity(state: GameState): TurnActivity {
  let value = activityByState.get(state);
  if (value === undefined) {
    value = { currentDigimonAttackSeats: new Set(), previousDigimonAttackSeats: new Set() };
    activityByState.set(state, value);
  }
  return value;
}

export function recordDigimonAttack(state: GameState, seat: Seat): void {
  activity(state).currentDigimonAttackSeats.add(seat);
}

export function rollTurnActivity(state: GameState): void {
  const value = activity(state);
  value.previousDigimonAttackSeats = new Set(value.currentDigimonAttackSeats);
  value.currentDigimonAttackSeats.clear();
}

export function attackedWithDigimonInCurrentOrPreviousTurn(state: GameState, seat: Seat): boolean {
  const value = activity(state);
  return value.currentDigimonAttackSeats.has(seat) || value.previousDigimonAttackSeats.has(seat);
}

/** Whether a player has attacked with a Digimon during the currently ending turn. */
export function attackedWithDigimonThisTurn(state: GameState, seat: Seat): boolean {
  return activity(state).currentDigimonAttackSeats.has(seat);
}
