import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import {
  GameState,
  PlayerState,
  CardInstance,
  Phase,
  type Seat,
} from "@aegis/shared";
import { TurnStateMachine, type TurnFlowHooks, type MainPhaseEnd } from "./TurnStateMachine.js";

/**
 * BLK-05.3 proving A3 — the first-player draw-skip flow is ALREADY CORRECT.
 *
 * `TurnStateMachine.drawPhase` (TurnStateMachine.ts:218) skips the first turn's
 * draw via `state.isFirstPlayersFirstTurn`, behaviorally equivalent to the source
 * `documented behavior` `if (TurnCount != 1)`. There is no fix here; this is
 * a guardrail that drives a real 2-turn run, asserts the hand/deck DELTA (not just
 * deck length), and pins the fails-when-reverted lever so a future edit that drops
 * the skip turns this suite RED.
 */

const OPENING_HAND = 5;
const DECK_SIZE = 10;

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
    player.hand = new ArraySchema<CardInstance>();
    for (let i = 0; i < DECK_SIZE; i += 1) {
      const card = new CardInstance();
      card.instanceId = `${seat}-deck-${i}`;
      card.cardId = "TEST-001";
      card.ownerSeat = seat;
      player.deck.push(card);
    }
    for (let i = 0; i < OPENING_HAND; i += 1) {
      const card = new CardInstance();
      card.instanceId = `${seat}-hand-${i}`;
      card.cardId = "TEST-001";
      card.ownerSeat = seat;
      player.hand.push(card);
    }
    state.players[seat] = player;
  }
  return state;
}

/**
 * Hooks whose `draw` actually moves `count` cards deck -> hand, so the hand growth
 * and deck shrink are both observable. `deckCount` reads the live deck length.
 */
function makeHooks(state: GameState): TurnFlowHooks {
  return {
    fireTiming: async () => {},
    draw: async (seat, count) => {
      const player = state.players[seat]!;
      let drawn = 0;
      for (let i = 0; i < count && player.deck.length > 0; i += 1) {
        const card = player.deck.pop()!;
        player.hand.push(card);
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
    clearDurations: async () => {},
  };
}

describe("first player draw-skip across a 2-turn run", () => {
  it("first player draws 0 on turn 1 (hand stays 5, deck unchanged) then the flag clears", async () => {
    const state = makeState(0);
    const machine = new TurnStateMachine(state, makeHooks(state));

    expect(state.isFirstPlayersFirstTurn).toBe(true);

    await machine.runTurn(); // turn 1 — first player skips the Draw

    expect(state.players[0]!.hand.length).toBe(OPENING_HAND); // no draw -> hand unchanged
    expect(state.players[0]!.deck.length).toBe(DECK_SIZE); // deck unchanged
    expect(state.isFirstPlayersFirstTurn).toBe(false); // cleared after turn 1's End phase
  });

  it("second player draws exactly 1 on turn 2 (hand +1, deck -1)", async () => {
    const state = makeState(0);
    const machine = new TurnStateMachine(state, makeHooks(state));

    await machine.runTurn(); // turn 1 — first player (seat 0), skip

    // Hand the turn to the second seat, mirroring what run()'s passTurn would do
    // between turns. The flag is already false after turn 1's End phase.
    state.turnSeat = 1;
    await machine.runTurn(); // turn 2 — second player (seat 1) draws

    expect(state.players[1]!.hand.length).toBe(OPENING_HAND + 1); // drew 1
    expect(state.players[1]!.deck.length).toBe(DECK_SIZE - 1); // deck shrank by 1
  });

  it("fails-when-reverted: bypassing the skip makes the first player draw on turn 1", async () => {
    const state = makeState(0);
    // Simulate dropping the production skip: removing the
    // `if (this.state.isFirstPlayersFirstTurn) return;` guard at
    // TurnStateMachine.ts:218 makes turn-1 draw happen. With the flag forced false
    // before turn 1, drawPhase falls through to the draw — and the hand-stays-at-5
    // assertion above would go RED.
    state.isFirstPlayersFirstTurn = false;
    const machine = new TurnStateMachine(state, makeHooks(state));

    await machine.runTurn(); // turn 1, but skip is bypassed -> draws

    expect(state.players[0]!.hand.length).toBe(OPENING_HAND + 1); // drew on turn 1
    expect(state.players[0]!.deck.length).toBe(DECK_SIZE - 1);
  });
});
