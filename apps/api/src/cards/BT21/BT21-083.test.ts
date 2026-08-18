import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT21-083 (Taiki Kudo) — [Start of Your Main Phase]:
//   "By placing 1 Digimon card with the [Xros Heart]/[Blue Flare]/[Hero] trait from your
//    hand under this Tamer, <Draw 1> and gain 1 memory."
//
// FAILS-WHEN-REVERTED: with BT21-083 on the battle area, firing OnStartMainPhase on
// seat 0's turn with a qualifying Digimon in hand draws 1 and gains 1 memory. Without
// the hand-written module the RawUnparsed [Your Turn] clause stays inert and the
// StartOfMainPhase GainMemory + draw actions remain absent.
//
// Two proofs:
//   1. Positive: Xros Heart Digimon in hand → draw 1 + gain 1 memory.
//   2. Negative: no qualifying Digimon in hand → no draw, no memory change.

// BT10-008 (Shoutmon) has types: ["Xros Heart"] — qualifies.
// BT1-009 (Monodramon) has types: ["Mini Dragon"] — does not qualify.
const TAIKI = "BT21-083"; // the Tamer
const XROS_HEART_DIGIMON = "BT10-008"; // Shoutmon — [Xros Heart] trait
const PLAIN_DIGIMON = "BT1-009"; // Monodramon — no qualifying trait

function fireTiming(
  s: EngineSetup,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (s.engine as unknown as {
    fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
  }).fireTiming(timing, trigger);
}

describe("BT21-083 [Start of Main Phase] place Xros Heart Digimon under Tamer → draw + memory", () => {
  it("places Xros Heart Digimon under Tamer, draws 1, gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          // Taiki (Tamer) on the battle area.
          battleArea: [{ card: TAIKI, dp: 0, as: "taiki" }],
          // Xros Heart Digimon in hand.
          hand: [{ card: XROS_HEART_DIGIMON, as: "xros" }],
          // Card in deck to draw.
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const xrosId = s.inst("xros").instanceId;

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0; // 1

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    // The Xros Heart card leaves hand and a draw card arrives — net hand change is 0.
    // deck goes from 1 to 0.
    for (let i = 0; i < 400 && (p0?.deck.length ?? 0) !== 0; i++) await Promise.resolve();

    // The Xros Heart card should now be under the Tamer (in its stack).
    expect(s.perm("taiki").stack.some((c) => c.instanceId === xrosId)).toBe(true);
    // Hand changed: lost 1 (placed under Tamer) + gained 1 (draw) = net 0.
    expect(p0?.hand.length).toBe(handBefore - 1 + 1);
    // Memory gained by 1.
    expect(s.state.memory).toBe(memBefore + 1);
    // Deck is now empty (draw consumed the 1 card).
    expect(p0?.deck.length).toBe(0);
  });

  it("does NOT draw when no qualifying Digimon is in hand (canActivate gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, dp: 0, as: "taiki" }],
          // Only a plain Digimon (no Xros Heart/Blue Flare/Hero) in hand.
          hand: [PLAIN_DIGIMON],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // No change: the canActivate gate should fail (no qualifying card in hand).
    expect(p0?.hand.length).toBe(handBefore);
    expect(s.state.memory).toBe(memBefore);
    expect(p0?.deck.length).toBe(1);
    expect(s.perm("taiki").stack.length).toBe(0);
  });
});
