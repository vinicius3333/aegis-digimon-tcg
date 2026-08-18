import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, Phase, type Seat } from "@aegis/shared";
import { MainPhaseController } from "./MainPhaseController.js";
import { MemoryGauge } from "./MemoryGauge.js";

function makeState(turnSeat: Seat = 0, memory = 0): GameState {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = turnSeat;
  state.memory = memory;
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }
  return state;
}

describe("MainPhaseController", () => {
  it("opens for a seat and resolves `passed` on a voluntary endPhase while holding memory", async () => {
    const state = makeState(0, 5); // turn player holds +5: not crossed
    const controller = new MainPhaseController(state, new MemoryGauge(state));

    const run = controller.run(0);
    expect(controller.isOpen).toBe(true);
    expect(controller.seat).toBe(0);

    const ok = controller.endPhaseRequested(0);
    expect(ok).toBe(true);

    await expect(run).resolves.toBe("passed");
    expect(controller.isOpen).toBe(false);
  });

  it("ends immediately as `crossed` if the gauge is already across on entry", async () => {
    const state = makeState(0, -3); // deeply crossed
    const controller = new MainPhaseController(state, new MemoryGauge(state));
    const run = controller.run(0);
    expect(controller.isOpen).toBe(false); // never opened a waiting promise
    await expect(run).resolves.toBe("crossed");
  });

  it("endPhase reports `crossed` (not `passed`) when the gauge crossed during the turn", async () => {
    const state = makeState(0, 2);
    const memory = new MemoryGauge(state);
    const controller = new MainPhaseController(state, memory);

    const run = controller.run(0);
    expect(controller.isOpen).toBe(true);

    // A paid action crossed the gauge, but the player also sends endPhase before the
    // engine's post-action checkTurnEnd ran. endPhase must still report `crossed` so
    // the End phase does not grant a pass-turn bonus.
    memory.pay(0, 3); // 2 -> -1 (crossed)
    expect(controller.endPhaseRequested(0)).toBe(true);
    await expect(run).resolves.toBe("crossed");
  });

  it("checkTurnEnd resolves `crossed` after a paid action pushes the gauge over", async () => {
    const state = makeState(0, 2);
    const memory = new MemoryGauge(state);
    const controller = new MainPhaseController(state, memory);

    const run = controller.run(0);
    expect(controller.isOpen).toBe(true);

    // A paid action: turn player pays 3, gauge 2 -> -1 (opponent now +1 >= min).
    memory.pay(0, 3);
    controller.checkTurnEnd();

    await expect(run).resolves.toBe("crossed");
    expect(controller.isOpen).toBe(false);
  });

  it("honors a live turn-end threshold override from a Your Turn effect", async () => {
    const state = makeState(0, -1); // opponent is at +1, below BT14-081's +3 threshold
    const memory = new MemoryGauge(state);
    memory.setTurnEndMinMemory(0, 3);
    const controller = new MainPhaseController(state, memory);
    const run = controller.run(0);
    expect(controller.isOpen).toBe(true);

    state.memory = -3; // opponent reaches +3
    controller.checkTurnEnd();
    await expect(run).resolves.toBe("crossed");
  });

  it("checkTurnEnd is a no-op while the gauge has not crossed", () => {
    const state = makeState(0, 5);
    const controller = new MainPhaseController(state, new MemoryGauge(state));
    void controller.run(0);
    controller.checkTurnEnd();
    expect(controller.isOpen).toBe(true); // still waiting
  });

  it("rejects endPhase from the non-turn seat", () => {
    const state = makeState(0, 5);
    const controller = new MainPhaseController(state, new MemoryGauge(state));
    void controller.run(0);
    expect(controller.endPhaseRequested(1)).toBe(false);
    expect(controller.isOpen).toBe(true);
  });

  it("rejects endPhase when no Main phase is open", () => {
    const state = makeState(0, 5);
    const controller = new MainPhaseController(state, new MemoryGauge(state));
    expect(controller.endPhaseRequested(0)).toBe(false);
  });

  it("abort() resolves an open phase as `crossed`", async () => {
    const state = makeState(0, 5);
    const controller = new MainPhaseController(state, new MemoryGauge(state));
    const run = controller.run(0);
    controller.abort();
    await expect(run).resolves.toBe("crossed");
    expect(controller.isOpen).toBe(false);
  });

  it("throws when run is called while a phase is already open", () => {
    const state = makeState(0, 5);
    const controller = new MainPhaseController(state, new MemoryGauge(state));
    void controller.run(0);
    expect(() => controller.run(0)).toThrow(/already open/);
  });
});
