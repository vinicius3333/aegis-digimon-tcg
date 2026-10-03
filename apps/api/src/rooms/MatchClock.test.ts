import { describe, expect, it } from "vitest";
import { GameState, matchTimerSettings } from "@aegis/shared";
import { MatchClock } from "./MatchClock.js";

function clock(options = { matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 15 }) {
  const state = new GameState();
  return { state, timer: new MatchClock(state, options, true, 0) };
}

describe("optional match clock", () => {
  it("keeps waiting rooms and disabled clocks untouched", () => {
    const { state, timer } = clock();
    timer.update(90_000, undefined);
    expect(state.timerRemaining0).toBe(60);
    state.matchTimer = false;
    timer.update(90_000, 0);
    expect(timer.update(200_000, 0)).toBeUndefined();
    expect(state.timerActiveSeat).toBe(-1);
  });

  it("charges only the player asked to act, including the defending player's response", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.update(10_000, 1);
    timer.update(15_000, 0);
    expect(state.timerRemaining0).toBe(50);
    expect(state.timerRemaining1).toBe(55);
    expect(state.timerActiveSeat).toBe(0);
  });

  it("pauses during resolution and resumes without charging the paused interval", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.update(10_000, undefined);
    timer.update(100_000, 1);
    timer.update(101_000, 1);
    expect(state.timerRemaining0).toBe(50);
    expect(state.timerRemaining1).toBe(59);
  });

  it("grants a bounded presentation pause, even when no client reports completion", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.pauseForPresentation(0);
    timer.update(1500, 0);
    expect(state.timerActiveSeat).toBe(-1);
    timer.update(3000, 0);
    expect(state.timerRemaining0).toBe(59);
    expect(state.timerActiveSeat).toBe(0);
  });

  it("refills only the new turn owner once, caps the bank, and skips the opening refill", () => {
    const { state, timer } = clock();
    state.turnCount = 1;
    timer.update(0, 0);
    timer.update(20_000, 1);
    state.turnCount = 2;
    state.turnSeat = 1;
    timer.update(25_000, 1);
    expect(state.timerRemaining1).toBe(60);
    timer.update(30_000, 1);
    expect(state.timerRemaining1).toBe(55);
    state.turnCount = 3;
    state.turnSeat = 0;
    timer.update(30_000, 0);
    expect(state.timerRemaining0).toBe(55);
    timer.update(30_000, 0);
    expect(state.timerRemaining0).toBe(55);
  });

  it("expires before an answer or refill arriving at the deadline", () => {
    const { state, timer } = clock();
    state.turnCount = 1;
    timer.update(0, 0);
    state.turnCount = 2;
    expect(timer.update(60_000, 1)).toBe(0);
    expect(state.timerRemaining0).toBe(0);
    expect(state.timerActiveSeat).toBe(-1);
  });

  it("stops charging when the match is over", () => {
    const { state, timer } = clock();
    timer.update(0, 1);
    timer.update(10_000, 1);
    state.gameOver = true;
    expect(timer.update(80_000, 1)).toBeUndefined();
    expect(state.timerRemaining1).toBe(50);
    expect(state.timerActiveSeat).toBe(-1);
  });

  it("ignores public overrides and rejects malformed private timing options", () => {
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 0 })).toEqual({
      enabled: true,
      startSeconds: 300,
      refillSeconds: 30,
    });
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: -1, timerRefillSeconds: Infinity }, true)).toEqual(
      { enabled: true, startSeconds: 300, refillSeconds: 30 },
    );
    expect(matchTimerSettings({ matchTimer: "true" } as never, true).enabled).toBe(false);
  });
});
