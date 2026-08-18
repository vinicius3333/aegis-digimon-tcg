import { describe, it, expect } from "vitest";
import { type PlayerState, EffectTiming, type Seat } from "@aegis/shared";
// Self-register every compiled-IR card so the engine resolves BT1-085's StartOfYourTurn
// SetMemory through the real interpreter (boot side-effect).
import "../cards/index.js";
import { setupEngine, type EngineSetup } from "./testkit/harness.js";

/**
 * SYS-06 — turn-end / start-of-turn A3 harness.
 *
 * No `OnEndTurn` / `StartOfYourTurn` A3 existed before this file (confirmed in research):
 * those windows are only reachable through the real turn loop, so the hand-laid intent
 * harness in mechanic.test.ts could never open them — which is exactly why the two
 * `it.todo` A3s at mechanic.test.ts (BT1-085 SetMemory, DnaDigivolve standalone forms)
 * are blocked. This harness drives the REAL GameEngine turn path via the thin
 * `runOneTurn()` seam (a pass-through to `turnMachine.runTurn()`), so OnStartTurn /
 * OnEndTurn fire effects through the production `fireTiming`.
 *
 * It asserts three things that together pin the real turn-end timing:
 *   1. OnEndTurn fires EXACTLY ONCE per turn (no double-fire), observed on the real
 *      `fireTiming` seam, with `turnSeat` STILL = the ending player at that moment
 *      (TurnStateMachine.ts:273 fires OnEndTurn before the phase flips to End at :276).
 *   2. A real Start-of-Your-Turn effect (BT1-085 SetMemory -> 3 when memory <= 2) resolves
 *      on the next turn's OnStartTurn window — a concrete memory delta, not "no error".
 *   3. The first-player draw-skip flag clears exactly once, after turn 1's End phase.
 *
 * FAILS-WHEN-REVERTED (harness lever): if `runOneTurn()` did not reach the OnEndTurn /
 * OnStartTurn windows (seam removed / not driven), the single-fire + turnSeat + memory-to-3
 * assertions go RED. PRODUCTION-CODE lever (recorded in the plan SUMMARY): firing OnEndTurn
 * AFTER the phase flips to End at TurnStateMachine.ts:273 (turnSeat no longer the ending
 * player) — or clearing `isFirstPlayersFirstTurn` one step early — flips these assertions
 * RED, proving the harness catches a genuine timing regression.
 */

interface Harness extends EngineSetup {
  /** OnEndTurn invocations observed on the real fireTiming seam, with the live turnSeat. */
  endTurnFires: { turnSeat: Seat }[];
  /** OnStartTurn invocations observed on the real fireTiming seam. */
  startTurnFires: number;
  /**
   * `state.memory` captured immediately AFTER each OnStartTurn window resolved, so a
   * Start-of-Your-Turn effect's delta is observed at its window — before the end-of-turn
   * pass-turn memory rule (TurnStateMachine.ts:269) reframes the gauge.
   */
  memoryAfterStartTurn: number[];
}

/**
 * Seat both players on small staged decks (so the draw phase has a deck to read, and one
 * playable hand card so the Main phase has a legal action — the engine auto-ends the Main
 * phase at entry when the turn player has nothing to do), then wrap the engine's real
 * `fireTiming` to record the OnStartTurn / OnEndTurn windows the turn loop opens. The wrap
 * forwards to the original method, so every effect still resolves through the production
 * path — the spy only observes, it does not stub.
 */
function harness(): Harness {
  const s = setupEngine({
    0: { deck: Array.from({ length: 5 }, () => "AD1-001"), hand: ["AD1-001"] },
    1: { deck: Array.from({ length: 5 }, () => "AD1-001"), hand: ["AD1-001"] },
  });
  s.state.isFirstPlayersFirstTurn = true;

  const endTurnFires: { turnSeat: Seat }[] = [];
  const memoryAfterStartTurn: number[] = [];
  let startTurnFires = 0;
  // Shadow the (private) fireTiming on the instance. The turn hooks call `this.fireTiming`,
  // which resolves to this instance shadow; it forwards to the prototype original so the
  // real timing collect/resolve still runs. Observing here proves the loop opened the
  // window AND captures the live turnSeat at OnEndTurn (the timing-sensitive assertion).
  const engineAny = s.engine as unknown as {
    fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
  };
  const original = engineAny.fireTiming.bind(s.engine);
  engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
    if (timing === EffectTiming.OnEndTurn) endTurnFires.push({ turnSeat: s.state.turnSeat });
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) {
      startTurnFires += 1;
      memoryAfterStartTurn.push(s.state.memory); // delta observed AT the window, pre pass-turn rule
    }
    return result;
  };

  return {
    ...s,
    endTurnFires,
    memoryAfterStartTurn,
    get startTurnFires() {
      return startTurnFires;
    },
  };
}

/**
 * Drive ONE turn through the real loop. `runOneTurn()` blocks in the interactive Main
 * phase until the turn player passes, so kick the turn promise, wait for the Main phase
 * to open, send the `endPhase` intent, then await completion.
 */
async function driveTurn(h: Harness, seat: Seat): Promise<void> {
  const turn = h.engine.runOneTurn();
  // Wait until the Main phase is actually OPEN (the controller's resolver is set) — phase
  // turning Main precedes `mainPhase.run`, which only opens after the OnStartMainPhase
  // window awaits, so gate on isOpen, not the phase value alone.
  const mainPhase = (h.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) {
    await Promise.resolve();
  }
  expect(mainPhase.isOpen, "Main phase opened by the real loop").toBe(true);
  expect(h.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

describe("turn end harness — real loop fires OnEndTurn once with the ending seat", () => {
  it("fires OnEndTurn exactly once per turn with turnSeat = the ending player", async () => {
    const h = harness();
    const p0 = h.state.players[0] as PlayerState;
    const handBefore = p0.hand.length;
    const deckBefore = p0.deck.length;

    await driveTurn(h, 0); // turn 1 (seat 0)

    // OnEndTurn fired exactly once, and at that moment turnSeat was still seat 0 (the
    // ending player) — TurnStateMachine fires it BEFORE flipping the phase to End.
    expect(h.endTurnFires).toHaveLength(1);
    expect(h.endTurnFires[0]!.turnSeat).toBe(0);
    // The window genuinely opened through the loop (not stubbed).
    expect(h.startTurnFires).toBe(1);
    // First-player draw-skip flag cleared after turn 1's End phase.
    expect(h.state.isFirstPlayersFirstTurn).toBe(false);
    // The first player skipped the turn-1 Draw: hand and deck unchanged. This pins the
    // production timing of the flag-read — clearing `isFirstPlayersFirstTurn` one step
    // early (before drawPhase reads it) makes the first player draw on turn 1, flipping
    // both assertions RED (recorded production-timing lever in the plan SUMMARY).
    expect(p0.hand.length).toBe(handBefore);
    expect(p0.deck.length).toBe(deckBefore);
  });

  it("BT1-085 [Start of Your Turn] sets memory to 3 (<=2) on the next turn's start", async () => {
    const h = harness();

    // BT1-085 (Tai Kamiya) in seat 0's battle area: [Start of Your Turn] set memory to 3
    // when it is 2 or less. This is the behavior the :1848 it.todo could not reach.
    h.putOnBoard(0, { card: "BT1-085", dp: 3000 });
    h.state.memory = 1; // below the SetMemory(3) gate

    await driveTurn(h, 0); // turn 1 (seat 0) — OnStartTurn fires BT1-085 SetMemory

    // The effect resolved through the real OnStartTurn window: memory raised 1 -> 3,
    // observed AT the window (the end-of-turn pass-turn memory rule reframes the gauge after).
    expect(h.startTurnFires).toBe(1);
    expect(h.memoryAfterStartTurn).toEqual([3]);
  });

  it("does NOT raise memory when it is already above the gate (negative)", async () => {
    const h = harness();

    h.putOnBoard(0, { card: "BT1-085", dp: 3000 });
    h.state.memory = 5; // above the <=2 gate — SetMemory must NOT fire

    await driveTurn(h, 0);

    // Unchanged at the OnStartTurn window: the memoryAtMost(2) condition gated SetMemory out.
    expect(h.memoryAfterStartTurn).toEqual([5]);
  });

  it("fires OnEndTurn once per turn across two turns, each with the right seat", async () => {
    const h = harness();

    await driveTurn(h, 0); // turn 1 (seat 0)
    // Hand the turn to seat 1, mirroring what the full run() loop's passTurn does: flip the
    // active seat and reframe the gauge (negate) so it is not already "crossed" on entry —
    // otherwise turn 2's Main phase ends immediately without opening.
    h.state.turnSeat = 1;
    h.state.memory = -h.state.memory;
    await driveTurn(h, 1); // turn 2 (seat 1)

    expect(h.endTurnFires).toHaveLength(2);
    expect(h.endTurnFires[0]!.turnSeat).toBe(0); // turn 1 ended on seat 0
    expect(h.endTurnFires[1]!.turnSeat).toBe(1); // turn 2 ended on seat 1
    expect(h.startTurnFires).toBe(2); // one OnStartTurn per turn
  });
});
