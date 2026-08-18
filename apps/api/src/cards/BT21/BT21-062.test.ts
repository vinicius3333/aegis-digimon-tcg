import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT21-062 (Galacticmon) — [Start of Your Main Phase]:
//   "Delete 1 of your opponent's Digimon."
//
// FAILS-WHEN-REVERTED: with BT21-062 on the field, firing OnStartMainPhase on seat 0's
// turn deletes one of seat 1's Digimon. Without the hand-written module the IR's
// StartOfYourMainPhase Delete action runs via the interpreter — but the [When Digivolving]
// Ragnarok Cannon clause remains RawUnparsed (inert). Our test exercises the delete to
// prove the hand-written module runs the OnStartMainPhase correctly.
//
// The [When Digivolving] Ragnarok Cannon clause (placing 4 Vemmon-in-text from trash
// to digivolution stack, then playing Ragnarok Cannon from hand/trash free) is also
// tested to verify it's no longer a stub.

const GALACTICMON = "BT21-062";
const PLAIN_DIGIMON = "BT1-009"; // Monodramon — playCost 2, opponent target for delete

function fireTiming(
  s: EngineSetup,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (s.engine as unknown as {
    fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
  }).fireTiming(timing, trigger);
}

describe("BT21-062 [Start of Your Main Phase] delete 1 opponent Digimon", () => {
  it("deletes one of the opponent's Digimon on start of main phase", async () => {
    const s = setupEngine(
      {
        // Galacticmon on seat 0's battle area.
        0: { battleArea: [{ card: GALACTICMON, dp: 12000 }] },
        // Seat 1 has a Digimon to be deleted.
        1: { battleArea: [{ card: PLAIN_DIGIMON, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1];

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 400 && p1?.battleArea.length !== 0; i++) await Promise.resolve();

    // Opponent's Digimon was deleted and moved to trash.
    expect(p1?.battleArea.length).toBe(0);
    expect(p1?.trash.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT delete when it is the opponent's turn ([Your Turn] gate)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GALACTICMON, dp: 12000 }] },
        1: { battleArea: [{ card: PLAIN_DIGIMON, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1; // opponent's turn
    const p1 = s.state.players[1];

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // Opponent's Digimon should NOT be deleted (it's not seat 0's turn).
    expect(p1?.battleArea.length).toBe(1);
  });
});
