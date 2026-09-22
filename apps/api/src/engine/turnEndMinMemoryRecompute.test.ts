import { describe, expect, it } from "vitest";
import { GameState, PlayerState, type Seat } from "@aegis/shared";
import { MemoryGauge } from "./MemoryGauge.js";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

const noPromptAsk = {
  optional: async () => false,
  chooseTargets: async () => [],
  selectCards: async () => [],
  selectPermanents: async () => [],
  chooseOption: async () => 0,
};

describe("turn-end memory threshold recompute", () => {
  it("publishes the staged tier only on commit", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    state.turnSeat = 0;
    const gauge = new MemoryGauge(state);

    gauge.setTurnEndMinMemory(0, 3);
    expect(gauge.turnEndMinMemoryFor(0)).toBe(3);

    // While a pass is staging, the live tier keeps the previous complete snapshot.
    gauge.beginTurnEndMinMemoryRecompute();
    expect(gauge.turnEndMinMemoryFor(0)).toBe(3);
    gauge.setTurnEndMinMemory(0, 3);
    expect(gauge.turnEndMinMemoryFor(0)).toBe(3);
    gauge.commitTurnEndMinMemoryRecompute();
    expect(gauge.turnEndMinMemoryFor(0)).toBe(3);

    // A pass whose gate no longer holds stages nothing, so the tier lapses on commit.
    gauge.beginTurnEndMinMemoryRecompute();
    expect(gauge.turnEndMinMemoryFor(0)).toBe(3);
    gauge.commitTurnEndMinMemoryRecompute();
    expect(gauge.turnEndMinMemoryFor(0)).toBe(1);
  });

  /**
   * Regression: the turn-end condition is read synchronously (MainPhaseController.
   * checkTurnEnd, the attack gate, the attack-target projection) while the continuous pass
   * that derives it awaits. A check landing mid-pass used to see the default threshold of 1
   * and end a turn that BT17-069's inherited clause was keeping open at 2 opponent memory
   * (Discord "fenrirloogamon take condition 3 or more mem"; KB Q2831).
   */
  it("never reports a half-derived threshold while a continuous pass is in flight", async () => {
    const s = setupEngine(
      {
        0: {
          // The reporter's stack: an awaiting continuous effect (BT17-091's Aura) is ordered
          // ahead of BT17-069's inherited SetTurnEndMemory, so the pass yields between them.
          battleArea: [{ card: "BT17-101", as: "host", under: ["BT17-091", "BT16-076", "BT17-069", "BT17-040"] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "blocker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = -2;

    expect(s.engine.memory.turnEndMinMemoryFor(0)).toBe(3);
    expect(s.engine.memory.hasCrossedToOpponent()).toBe(false);

    const pass = s.engine.runContinuousPass(noPromptAsk, new Map<string, number>());
    expect(s.engine.memory.turnEndMinMemoryFor(0 as Seat)).toBe(3);
    expect(s.engine.memory.hasCrossedToOpponent()).toBe(false);
    await pass;
    expect(s.engine.memory.turnEndMinMemoryFor(0 as Seat)).toBe(3);

    void turn.catch(() => {});
  }, 20000);
});
