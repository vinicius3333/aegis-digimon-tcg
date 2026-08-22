import { describe, it, expect } from "vitest";
import type { Seat } from "@aegis/shared";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
// Boot side-effect: self-register every compiled-IR card module (so BT19-040's real IR loads).
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

const PIPE_FOX_CARD_ID = "TOKEN-Pipe-Fox";

function pipeFoxCount(s: EngineSetup, seat: Seat = 0): number {
  return (s.state.players[seat]?.battleArea ?? []).filter((p) => p.topCard?.cardId === PIPE_FOX_CARD_ID).length;
}

describe("A3 BT19-040 Sakuyamon — whenOptionUsed token watcher: cost-2+ Option => [Pipe Fox] Token", () => {
  it("plays a [Pipe Fox] Token when you use an Option with a cost of 2 or more", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-040", dp: 11000 }] } });
    await s.engine.recomputeContinuousEffects();
    expect(pipeFoxCount(s)).toBe(0);

    // Fire the produce-site event with a used-Option cost of 3 (>= 2).
    await primitivesOf(s).fireOptionUsed("opt-instance", 3);
    await settle(() => pipeFoxCount(s) > 0);

    // FAILS-WHEN-REVERTED: drop the whenOptionUsed SubTrigger => no token is played.
    expect(pipeFoxCount(s)).toBe(1);
  });

  it("plays NO token when the used Option's cost is 1 (the cost-2+ gate, KB Q5471-Q5473)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-040", dp: 11000 }] } });
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).fireOptionUsed("opt-instance", 1); // cost 1 < 2
    await settle(() => false, 60);

    expect(pipeFoxCount(s)).toBe(0); // the cost gate skips the body
  });

  it("plays NO token on the opponent's turn (the [Your Turn] gate)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-040", dp: 11000 }] } });
    s.state.turnSeat = 1; // not BT19-040's controller's turn
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).fireOptionUsed("opt-instance", 3);
    await settle(() => false, 60);

    expect(pipeFoxCount(s)).toBe(0); // the watcher is not installed on the opponent's turn
  });
});
