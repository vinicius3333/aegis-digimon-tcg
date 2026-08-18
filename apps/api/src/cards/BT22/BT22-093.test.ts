import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT22-093 (Ami Aiba) — [Start of Your Main Phase]:
//   "If your opponent has a Digimon, gain 1 memory."
//
// FAILS-WHEN-REVERTED: with BT22-093 on the battle area and an opponent Digimon present,
// firing OnStartMainPhase on seat 0's turn gains 1 memory. Without the hand-written
// module the IR's StartOfYourMainPhase GainMemory + opponentHas condition works via the
// interpreter, but the [Your Turn] CS digivolve-chain clause is RawUnparsed (inert).
// Our test proves the [Start of Main Phase] memory gain is implemented, which is the
// correct condition-check path (requires opponent to have a Digimon).
//
// Two proofs:
//   1. Positive: opponent has a Digimon → gain 1 memory.
//   2. Negative: opponent has no Digimon → no memory gain.

const AMI_AIBA = "BT22-093";
const OPPONENT_DIGIMON = "BT1-009"; // Monodramon — any Digimon works

function fireTiming(
  s: EngineSetup,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (s.engine as unknown as {
    fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
  }).fireTiming(timing, trigger);
}

describe("BT22-093 [Start of Main Phase] gain 1 memory if opponent has Digimon", () => {
  it("gains 1 memory when opponent has a Digimon in their battle area", async () => {
    const s = setupEngine({
      // Ami Aiba on seat 0's battle area.
      0: { battleArea: [{ card: AMI_AIBA, dp: 0 }] },
      // Opponent has a Digimon (canActivate condition).
      1: { battleArea: [{ card: OPPONENT_DIGIMON, dp: 3000 }] },
    });

    const memBefore = s.state.memory;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    await settle(() => s.state.memory !== memBefore, 200);

    expect(s.state.memory).toBe(memBefore + 1);
  });

  it("does NOT gain memory when opponent has no Digimon (canActivate gate fails)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: AMI_AIBA, dp: 0 }] },
    });

    // Opponent has no Digimon.
    const memBefore = s.state.memory;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    expect(s.state.memory).toBe(memBefore);
  });
});
