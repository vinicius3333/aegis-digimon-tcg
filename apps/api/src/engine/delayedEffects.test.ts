import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
// Self-register every compiled-IR card so the engine resolves BT1-086's StartOfYourTurn
// SetMemory through the real interpreter (boot side-effect).
import "../cards/index.js";

/**
 * SYS-02 (delayed-and-rule-effects) — the delayed-trigger promotion vehicle.
 *
 * A delayed/installed effect must fire at a FUTURE timing window, never immediately on
 * install. The sub-trigger bus (interpreter.ts runSubTrigger) and the timing windows
 * (TurnStateMachine -> GameEngine.fireTiming) already exist; this subsystem was `missing`
 * only for lack of an A3 that pins the install-vs-future-window DISCRIMINATION.
 *
 * Vehicle: BT1-086 Matt Ishida [Start of Your Turn] "set memory to 3 if it is 2 or less".
 * IR-FAITHFUL (LOCKED Q3): the compiled IR is `SubTrigger`-free for this leg — a plain
 * `{ trigger: "StartOfYourTurn", actions: [SetMemory(3) if memoryAtMost(2)] }` whose
 * timing routes through EffectTiming.OnStartTurn (interpreter.ts:1988) and is gated to the
 * controller's own turn by turnOwnerGuard. This is NOT a force-attack mismodel like
 * BT23-056 / BT20-083 (mechanic.test.ts:2072-2096). KB BT1-086 Q948 confirms the semantics
 * ("starting the turn at 1 memory ... resolve this card's effect ... to go up to 3 memory");
 * the card carries no errata. The vehicle is distinct from BT1-085 (already proven for the
 * raw OnStartTurn window in turnEndHarness.test.ts); this suite adds the install-time-ABSENT
 * assertion that turn-end harness does not make.
 *
 * Discrimination proven:
 *   1. At INSTALL time (BT1-086 placed on the field + the continuous layer recomputed),
 *      the SetMemory delta is ABSENT — memory stays at its pre-window value.
 *   2. At the FUTURE window (the next OnStartTurn opened by the real turn loop), the delta
 *      APPEARS — memory is raised to 3.
 *
 * FAILS-WHEN-REVERTED (recorded production levers):
 *   - INSTALL-FIRES-IMMEDIATELY: if the StartOfYourTurn effect resolved at install/recompute
 *     instead of OnStartTurn (e.g. mapping its timing to EffectTiming.None), the install-time
 *     assertion `memory === 1` goes RED (memory would already be 3 before the window).
 *   - NEVER-FIRES: if the OnStartTurn window did not resolve the effect (timing unmapped /
 *     the turn loop seam removed), the future-window assertion `memory === 3` goes RED
 *     (memory would stay at 1 across the window).
 */

let seq = 0;

function instance(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const card = new CardInstance();
  card.instanceId = `inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

function digimon(seat: Seat, cardId: string, dp = 3000): Permanent {
  seq += 1;
  const permanent = new Permanent();
  permanent.permanentId = `perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = instance(cardId, seat, true);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

interface Harness {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
  /** `state.memory` captured immediately AFTER each OnStartTurn window resolved. */
  memoryAfterStartTurn: number[];
  startTurnFires: number;
}

/**
 * Seat both players on empty staged decks, then wrap the engine's real `fireTiming` to
 * record the OnStartTurn window. The wrap forwards to the original method, so every effect
 * still resolves through the production path — the spy only observes, it does not stub.
 */
function harness(firstSeat: Seat = 0): Harness {
  const state = new GameState();
  const events: ServerEvent[] = [];
  const hooks: GameEngineHooks = {
    seed: firstSeat === 0 ? 0 : 1, // chooseFirstPlayer derives the seat from seed & 1
    requestDecision: (_seat: Seat, _req: DecisionRequest) => {},
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });

  // One playable hand card per seat so the Main phase has a legal action — the engine
  // auto-ends the Main phase at entry when the turn player has nothing to do, which would
  // close the window before driveTurn can observe it.
  for (const seat of [0, 1] as const) {
    const player = state.players[seat] as PlayerState;
    for (let i = 0; i < 5; i += 1) player.deck.push(instance("AD1-001", seat, false));
    player.hand.push(instance("AD1-001", seat, true));
  }

  state.turnSeat = firstSeat;
  state.isFirstPlayersFirstTurn = true;

  const memoryAfterStartTurn: number[] = [];
  let startTurnFires = 0;
  const engineAny = engine as unknown as {
    fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
  };
  const original = engineAny.fireTiming.bind(engine);
  engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) {
      startTurnFires += 1;
      memoryAfterStartTurn.push(state.memory); // delta observed AT the window, pre pass-turn rule
    }
    return result;
  };

  return {
    engine,
    state,
    events,
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
  const mainPhase = (h.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) {
    await Promise.resolve();
  }
  expect(mainPhase.isOpen, "Main phase opened by the real loop").toBe(true);
  expect(h.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

/** Recompute the continuous (install-time) layer without opening any timing window. */
async function recomputeInstall(h: Harness): Promise<void> {
  await (h.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

describe("A3 delayed effect — BT1-086 [Start of Your Turn] fires at the FUTURE window, not at install (SYS-02)", () => {
  it("is ABSENT at install and APPEARS at the next OnStartTurn window", async () => {
    const h = harness(0);
    const p0 = h.state.players[0] as PlayerState;

    // Install: BT1-086 enters seat 0's battle area with memory below the SetMemory(3) gate.
    p0.battleArea.push(digimon(0, "BT1-086"));
    h.state.memory = 1;

    // Recompute the continuous layer (the install-time seam). The delayed [Start of Your
    // Turn] effect must NOT resolve here — its window has not opened. (install-time ABSENT)
    await recomputeInstall(h);
    expect(h.startTurnFires, "no OnStartTurn window opened at install").toBe(0);
    expect(h.state.memory, "delayed SetMemory must be ABSENT at install").toBe(1);

    // Advance to the FUTURE window: the next turn's OnStartTurn fires the installed effect.
    await driveTurn(h, 0);

    // The delayed effect resolved AT its future window: memory raised 1 -> 3.
    expect(h.startTurnFires, "exactly one OnStartTurn window opened").toBe(1);
    expect(h.memoryAfterStartTurn, "delta APPEARS at the future window").toEqual([3]);
  });

  it("does NOT fire at the future window when its condition is already unmet (negative)", async () => {
    const h = harness(0);
    const p0 = h.state.players[0] as PlayerState;

    p0.battleArea.push(digimon(0, "BT1-086"));
    h.state.memory = 5; // above the memoryAtMost(2) gate

    await recomputeInstall(h);
    expect(h.state.memory).toBe(5); // absent at install

    await driveTurn(h, 0);

    // The window opened, but the memoryAtMost(2) condition gated SetMemory out: unchanged.
    expect(h.startTurnFires).toBe(1);
    expect(h.memoryAfterStartTurn).toEqual([5]);
  });
});
