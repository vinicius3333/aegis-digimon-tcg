import type { Seat, ServerEvent } from "@aegis/shared";

export function gameOverReason(input: {
  events: readonly ServerEvent[];
}): "security" | "deckOut" | "surrender" | "effect" {
  const { events } = input;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]!;
    if (e.kind === "gameOver") return e.reason;
  }
  return "security";
}

export function gameOverResult(input: {
  events: readonly ServerEvent[];
  viewerSeat: Seat;
  winnerSeat: number;
}): "win" | "loss" | "draw" {
  const { events, viewerSeat, winnerSeat } = input;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]!;
    if (e.kind === "gameOver")
      return e.result.outcome === "draw" ? "draw" : e.result.winnerSeat === viewerSeat ? "win" : "loss";
  }
  if (winnerSeat === -1) return "draw";
  return winnerSeat === viewerSeat ? "win" : "loss";
}

// Turn order is server truth: `matchStarted` names the seat that takes turn 1.
// Nothing is shown until that event has arrived rather than inferring a side.
export function viewerTurnOrder(input: {
  events: readonly ServerEvent[];
  viewerSeat: Seat;
}): "first" | "second" | undefined {
  const { events, viewerSeat } = input;
  const started = events.find((event) => event.kind === "matchStarted");
  if (started?.kind !== "matchStarted") return undefined;
  return started.firstSeat === viewerSeat ? "first" : "second";
}
