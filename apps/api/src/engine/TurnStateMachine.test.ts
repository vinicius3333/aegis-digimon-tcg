import { describe, it, expect, beforeEach } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, CardInstance, Phase, EffectTiming, type Seat, type ServerEvent } from "@aegis/shared";
import { TurnStateMachine, type TurnFlowHooks, type MainPhaseEnd, type DurationBoundary } from "./TurnStateMachine.js";
import { MemoryGauge, PASS_TURN_MEMORY } from "./MemoryGauge.js";

function makeState(firstSeat: Seat = 0): GameState {
  const state = new GameState();
  state.phase = Phase.None;
  state.turnSeat = firstSeat;
  state.isFirstPlayersFirstTurn = true;
  state.memory = 0;
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.deck = new ArraySchema<CardInstance>();
    state.players[seat] = player;
  }
  return state;
}

function fillDeck(state: GameState, seat: Seat, count: number): void {
  const player = state.players[seat]!;
  player.deck = new ArraySchema<CardInstance>();
  for (let i = 0; i < count; i += 1) {
    const card = new CardInstance();
    card.instanceId = `${seat}-deck-${i}`;
    card.cardId = "TEST-001";
    card.ownerSeat = seat;
    player.deck.push(card);
  }
}

/** A recording fake of TurnFlowHooks; tests override individual methods as needed. */
function makeHooks(
  state: GameState,
  overrides: Partial<TurnFlowHooks> = {},
): {
  hooks: TurnFlowHooks;
  timings: EffectTiming[];
  boundaries: DurationBoundary[];
} {
  const timings: EffectTiming[] = [];
  const boundaries: DurationBoundary[] = [];
  const base: TurnFlowHooks = {
    fireTiming: async (timing) => {
      timings.push(timing);
    },
    draw: async (seat, count) => {
      const player = state.players[seat]!;
      let drawn = 0;
      for (let i = 0; i < count && player.deck.length > 0; i += 1) {
        player.deck.pop();
        drawn += 1;
      }
      return drawn;
    },
    deckCount: (seat) => state.players[seat]?.deck.length ?? 0,
    unsuspendForActivePhase: async () => [],
    runBreedingPhase: async () => {},
    runMainPhase: async () => "passed" as MainPhaseEnd,
    isGameOver: () => state.gameOver,
    declareDeckOutLoss: (loserSeat) => {
      state.players[loserSeat]!.lost = true;
      state.gameOver = true;
      state.winnerSeat = (1 - loserSeat) as Seat;
    },
    clearDurations: async (boundary) => {
      boundaries.push(boundary);
    },
  };
  return { hooks: { ...base, ...overrides }, timings, boundaries };
}

describe("TurnStateMachine - single turn", () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
  });

  it("runs Active -> Draw -> Breeding -> Main -> End in order", async () => {
    const phases: string[] = [];
    const events: ServerEvent[] = [];
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks, undefined, (e) => {
      events.push(e);
      if (e.kind === "phaseChanged") phases.push(e.phase);
    });

    await machine.runTurn();

    expect(phases).toEqual([Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End]);
  });

  it("fires per-phase timing windows in the right order", async () => {
    const { hooks, timings } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();

    expect(timings).toEqual([
      EffectTiming.OnStartTurn,
      EffectTiming.OnStartMainPhase,
      EffectTiming.OnEndMainPhase,
      EffectTiming.OnEndTurn,
    ]);
  });

  it("opens the Main input controller before publishing asynchronous start-of-main work", async () => {
    let mainWindowOpened = false;
    let entryFinalized = false;
    const { hooks } = makeHooks(state, {
      runMainPhase: async () => {
        mainWindowOpened = true;
        return "passed";
      },
      fireTiming: async (timing) => {
        if (timing === EffectTiming.OnStartMainPhase) expect(mainWindowOpened).toBe(true);
      },
      finalizeMainPhaseEntry: () => {
        expect(mainWindowOpened).toBe(true);
        entryFinalized = true;
      },
    });

    await new TurnStateMachine(state, hooks).runTurn();

    expect(entryFinalized).toBe(true);
  });

  it("increments turnCount in the Active phase", async () => {
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    expect(state.turnCount).toBe(0);
    await machine.runTurn();
    expect(state.turnCount).toBe(1);
  });

  it("unsuspends the turn player's permanents during the Active phase", async () => {
    let unsuspendedSeat: Seat | undefined;
    const { hooks } = makeHooks(state, {
      unsuspendForActivePhase: async (seat) => {
        unsuspendedSeat = seat;
        return ["perm-1", "perm-2"];
      },
    });
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();
    expect(unsuspendedSeat).toBe(0);
  });

  it("clears isFirstPlayersFirstTurn after the End phase", async () => {
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    expect(state.isFirstPlayersFirstTurn).toBe(true);
    await machine.runTurn();
    expect(state.isFirstPlayersFirstTurn).toBe(false);
  });
});

describe("TurnStateMachine - first-player-skips-first-draw", () => {
  it("skips the Draw on the first player's first turn", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();

    expect(state.players[0]!.deck.length).toBe(10); // no draw
  });

  it("draws on every turn after the first", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn(); // first player's first turn: skip
    state.isFirstPlayersFirstTurn = false; // would be set by run(); set explicitly here
    state.turnSeat = 0;
    await machine.runTurn(); // now draws

    expect(state.players[0]!.deck.length).toBe(9);
  });
});

describe("TurnStateMachine - deck-out loss", () => {
  it("declares a loss when the turn player must draw from an empty deck", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 0); // empty deck
    fillDeck(state, 1, 10);
    state.isFirstPlayersFirstTurn = false; // past the skip-draw turn
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();

    expect(state.gameOver).toBe(true);
    expect(state.players[0]!.lost).toBe(true);
    expect(state.winnerSeat).toBe(1);
  });

  it("does not deck-out on the first player's first turn (no draw happens)", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 0);
    fillDeck(state, 1, 10);
    const { hooks } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();

    expect(state.gameOver).toBe(false);
  });
});

describe("TurnStateMachine - breeding window", () => {
  it("runs the breeding-phase window for the turn player", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
    const ranForSeat: Seat[] = [];
    const { hooks } = makeHooks(state, {
      runBreedingPhase: async (seat) => {
        ranForSeat.push(seat);
      },
    });
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();
    expect(ranForSeat).toEqual([0]);
  });

  it("awaits the breeding window before entering the Main phase", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
    const order: string[] = [];
    const { hooks } = makeHooks(state, {
      runBreedingPhase: async () => {
        order.push("breeding");
      },
      runMainPhase: async () => {
        order.push("main");
        return "passed";
      },
    });
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();
    expect(order).toEqual(["breeding", "main"]);
  });
});

describe("TurnStateMachine - turn passing across the loop", () => {
  it("alternates the turn seat between turns and stops on game over", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);

    const seatsSeenAtActive: Seat[] = [];
    let turns = 0;
    const { hooks } = makeHooks(state, {
      fireTiming: async (timing) => {
        if (timing === EffectTiming.OnStartTurn) {
          seatsSeenAtActive.push(state.turnSeat);
        }
      },
      runMainPhase: async () => {
        turns += 1;
        if (turns >= 4) state.gameOver = true; // stop after 4 turns
        return "passed";
      },
    });
    const machine = new TurnStateMachine(state, hooks);

    await machine.run();

    expect(seatsSeenAtActive).toEqual([0, 1, 0, 1]);
  });

  it("grants the incoming turn player +3 memory after a voluntary pass", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);

    const memoryAtActive: number[] = [];
    let turns = 0;
    const { hooks } = makeHooks(state, {
      fireTiming: async (timing) => {
        if (timing === EffectTiming.OnStartTurn) {
          memoryAtActive.push(state.memory);
        }
      },
      runMainPhase: async () => {
        turns += 1;
        if (turns >= 2) state.gameOver = true;
        return "passed";
      },
    });
    const machine = new TurnStateMachine(state, hooks);

    await machine.run();

    // Turn 1 starts at the initial 0; turn 2 starts after a pass: incoming player +3.
    expect(memoryAtActive[0]).toBe(0);
    expect(memoryAtActive[1]).toBe(PASS_TURN_MEMORY);
  });

  it("does NOT grant +3 when the turn ended by the gauge already crossing", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);

    const memoryAtActive: number[] = [];
    let turns = 0;
    const { hooks } = makeHooks(state, {
      fireTiming: async (timing) => {
        if (timing === EffectTiming.OnStartTurn) memoryAtActive.push(state.memory);
      },
      runMainPhase: async () => {
        turns += 1;
        // Simulate a paid action that pushed the gauge to the opponent's side.
        state.memory = -2; // opponent's memory is +2 >= min(1): crossed
        if (turns >= 2) state.gameOver = true;
        return "crossed";
      },
    });
    const machine = new TurnStateMachine(state, hooks);

    await machine.run();

    // After turn 1 ends with memory -2 (turn player frame), passTurn negates to +2
    // for the incoming player; no pass-reset applied.
    expect(memoryAtActive[0]).toBe(0);
    expect(memoryAtActive[1]).toBe(2);
  });

  it("refuses to run while already running", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
    const { hooks } = makeHooks(state, {
      runMainPhase: async () => {
        state.gameOver = true;
        return "passed";
      },
    });
    const machine = new TurnStateMachine(state, hooks);
    const first = machine.run();
    await expect(machine.run()).rejects.toThrow(/already running/);
    await first;
  });
});

describe("TurnStateMachine - duration boundaries", () => {
  it("signals duration boundaries across a turn", async () => {
    const state = makeState(0);
    fillDeck(state, 0, 10);
    fillDeck(state, 1, 10);
    const { hooks, boundaries } = makeHooks(state);
    const machine = new TurnStateMachine(state, hooks);

    await machine.runTurn();

    expect(boundaries).toContain("ownerTurnStart");
    expect(boundaries).toContain("ownerActivePhaseEnd");
    expect(boundaries).toContain("eachTurnEnd");
    expect(boundaries).toContain("ownerTurnEnd");
    expect(boundaries).toContain("opponentTurnEnd");
  });
});

describe("MemoryGauge", () => {
  let state: GameState;
  let events: ServerEvent[];
  let gauge: MemoryGauge;

  beforeEach(() => {
    state = makeState(0);
    events = [];
    gauge = new MemoryGauge(state, (e) => events.push(e));
  });

  it("gains memory in the turn player's favour and emits", () => {
    gauge.gainMemory(3);
    expect(state.memory).toBe(3);
    expect(events).toContainEqual({ kind: "memoryChanged", from: 0, to: 3, reason: "gainMemory" });
  });

  it("clamps to [-10, 10]", () => {
    gauge.setMemory(50);
    expect(state.memory).toBe(10);
    gauge.setMemory(-50);
    expect(state.memory).toBe(-10);
  });

  it("does not emit when the value is unchanged", () => {
    gauge.setMemory(0);
    expect(events).toHaveLength(0);
  });

  it("reports memoryFor each seat (turn-relative)", () => {
    state.turnSeat = 0;
    gauge.setMemory(4);
    expect(gauge.memoryFor(0)).toBe(4);
    expect(gauge.memoryFor(1)).toBe(-4);
  });

  it("detects crossing to the opponent at the default minimum (1)", () => {
    state.turnSeat = 0;
    gauge.setMemory(-1); // opponent's memory = +1 >= 1
    expect(gauge.hasCrossedToOpponent()).toBe(true);
    gauge.setMemory(0);
    expect(gauge.hasCrossedToOpponent()).toBe(false);
  });

  it("pays cost as the turn player, moving the gauge toward the opponent", () => {
    state.turnSeat = 0;
    gauge.setMemory(2);
    gauge.pay(0, 5); // 2 - 5 = -3
    expect(state.memory).toBe(-3);
  });

  it("computes affordability from the paying seat's perspective", () => {
    state.turnSeat = 0;
    gauge.setMemory(2); // turn player sees +2, floor is -10 => can pay up to 12
    expect(gauge.canPay(0, 12)).toBe(true);
    expect(gauge.canPay(0, 13)).toBe(false);
    expect(gauge.canPay(0, -1)).toBe(false);
  });
});
