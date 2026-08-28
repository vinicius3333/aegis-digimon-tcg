import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
// Self-register every compiled-IR card module (so real definitions resolve).
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, type EngineSetup } from "./testkit/harness.js";

/** Drive the OnStartMainPhase timing seam directly (the TurnStateMachine main-phase entry). */
async function fireStartMainPhase(s: EngineSetup, turnSeat: 0 | 1): Promise<void> {
  s.state.turnSeat = turnSeat;
  await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
    EffectTiming.OnStartMainPhase,
  );
}

/** Drive a turn-end boundary sweep (the engine's sweepDurations, as TurnStateMachine.endPhase does). */
function sweepTurnEnd(s: EngineSetup, turnEndSeat: 0 | 1): void {
  s.state.turnSeat = turnEndSeat;
  const engine = s.engine as unknown as { sweepDurations(b: string): void };
  engine.sweepDurations("eachTurnEnd");
  engine.sweepDurations("ownerTurnEnd");
  engine.sweepDurations("opponentTurnEnd");
}

describe("granted timed-trigger surface — startOfYourMainPhase on a chosen non-source permanent", () => {
  it("fires at the watched permanent's owner's main-phase start, not the granter's", async () => {
    // Seat-0 source (the granter) and a seat-1 victim Digimon (the watched permanent).
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "granter" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] },
    });
    const victim = s.perm("victim");

    // Install a startOfYourMainPhase watcher anchored on the SEAT-1 victim, gated to fire
    // only when the victim's owner is the turn player, expiring at the victim owner's turn end.
    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "startOfYourMainPhase",
      sourcePermanentId: victim.permanentId,
      once: false,
      matches: (ctx) => ctx.game.state.turnSeat === victim.controllerSeat,
      expiresOnTurnEndOf: victim.controllerSeat,
      run: async () => {
        fireCount += 1;
      },
      description: "test: granted [Start of Your Main Phase] on the seat-1 victim",
    });

    // Seat 0's main-phase start (the granter's turn): the gate fails => no fire.
    await fireStartMainPhase(s, 0);
    expect(fireCount).toBe(0);

    // Seat 1's main-phase start (the victim's owner): the gate passes => fires once.
    await fireStartMainPhase(s, 1);
    expect(fireCount).toBe(1);
  });

  it("expires at the watched owner's turn end (no fire on the next of their main phases)", async () => {
    const s = setupEngine({ 1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] } });
    const victim = s.perm("victim");

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "startOfYourMainPhase",
      sourcePermanentId: victim.permanentId,
      once: false,
      matches: (ctx) => ctx.game.state.turnSeat === victim.controllerSeat,
      expiresOnTurnEndOf: victim.controllerSeat,
      run: async () => {
        fireCount += 1;
      },
      description: "test: expiring granted trigger",
    });

    // First seat-1 main phase => fires.
    await fireStartMainPhase(s, 1);
    expect(fireCount).toBe(1);

    // Seat-1 turn ends => the grant expires.
    sweepTurnEnd(s, 1);

    // A later seat-1 main phase must NOT fire (the subscription was dropped at turn end).
    await fireStartMainPhase(s, 1);
    expect(fireCount).toBe(1);
  });
});
