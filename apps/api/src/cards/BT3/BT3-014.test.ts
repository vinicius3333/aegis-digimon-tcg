import { describe, it, expect } from "vitest";
import type { Permanent } from "@aegis/shared";
import { setupEngine as setup, type EngineSetup as Setup } from "../../engine/testkit/harness.js";
// Self-registers every card module (boot side-effect) so the engine can look up
// BT3-014's static color-grant effect.
import "./BT3-014.js";

/**
 * A3 for BT3-014 (Silphymon) — [Your Turn] "This card is also treated as yellow."
 *
 * KB (binding — `tools/kb/query.mjs card BT3-014`):
 *   - Q1054: during its owner's turn, treated as BOTH red (printed) AND yellow, so it
 *     satisfies a "Yellow" digivolution-color requirement.
 *   - Q1056/Q1057: not exercised here — see the pre-existing [When Digivolving] DP-set
 *     coverage; this test proves the [Your Turn] color-grant gap that was closed by
 *     wiring the (already-existing) `ctx.fx.addColorGrant` primitive.
 *
 * Mirrors the BT3-040 color-derivation oracle (engine/continuousColor.test.ts): read the
 * engine's effective-color accessor rather than asserting "the primitive was called".
 *
 * FAILS-WHEN-REVERTED: reverting the [Your Turn] clause to its prior inert form drops
 * "Yellow" from `effectiveColorsOf`, and the negative control's absence-on-opponent's-turn
 * assertion (Q1054/Q1055 gate) becomes vacuously true instead of a real regression check.
 */
describe("BT3-014 [Your Turn] color grant — also treated as yellow (KB Q1054/Q1055)", () => {
  function place(): Setup {
    return setup({ 0: { battleArea: [{ card: "BT3-014", dp: 6000, as: "base" }] } });
  }

  function effectiveColors(s: Setup, p: Permanent): string[] {
    return (s.engine as unknown as { effectiveColorsOf(p: Permanent): string[] }).effectiveColorsOf(
      p,
    );
  }

  it("is treated as both Red (printed) and Yellow during its owner's turn", async () => {
    const s = place();
    const base = s.perm("base");
    s.state.turnSeat = 0; // owner's turn

    await s.engine.recomputeContinuousEffects();

    const colors = effectiveColors(s, base);
    expect(colors).toContain("Red");
    expect(colors).toContain("Yellow");
  });

  it("negative control (Q1055): on the opponent's turn the yellow grant lapses", async () => {
    const s = place();
    const base = s.perm("base");
    s.state.turnSeat = 1; // opponent's turn from seat 0's perspective

    await s.engine.recomputeContinuousEffects();

    const colors = effectiveColors(s, base);
    expect(colors).toContain("Red"); // printed color always present
    expect(colors).not.toContain("Yellow"); // [Your Turn] grant does not apply
  });

  it("Q1055 does not grant yellow while Silphymon is in breeding", async () => {
    const s = setup({ 0: { breeding: { card: "BT3-014", as: "base" } } });
    await s.engine.recomputeContinuousEffects();

    expect(effectiveColors(s, s.perm("base"))).toEqual(["Red"]);
  });
});
