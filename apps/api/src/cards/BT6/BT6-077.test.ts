import { describe, it, expect } from "vitest";
import { EffectTiming, type Permanent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine as setup, type EngineSetup as Setup } from "../../engine/testkit/harness.js";
import "./BT6-077.js";

/**
 * A3 for BT6-077 (Rebellimon) — [All Turns] "This Digimon is also treated as black."
 *
 * KB (binding — `tools/kb/query.mjs card BT6-077`):
 *   - Q1466: the color treatment is load-bearing for digivolution color requirements and
 *     (unlike BT3-014/BT3-040's [Your Turn] variant) is NOT restricted to either player's
 *     turn — it holds "[All Turns]" while the card is on the battle area.
 *
 * Mirrors the BT3-040 color-derivation oracle (engine/continuousColor.test.ts): read the
 * engine's effective-color accessor rather than asserting "the primitive was called".
 *
 * FAILS-WHEN-REVERTED: removing the [All Turns] color clause drops
 * "Black" from `effectiveColorsOf` on both turns.
 */
describe("BT6-077 [All Turns] color grant — also treated as black (KB Q1466)", () => {
  function place(): Setup {
    return setup({ 0: { battleArea: [{ card: "BT6-077", dp: 8000, as: "base" }] } });
  }

  function effectiveColors(s: Setup, p: Permanent): string[] {
    return (s.engine as unknown as { effectiveColorsOf(p: Permanent): string[] }).effectiveColorsOf(
      p,
    );
  }

  it("is treated as both Purple (printed) and Black on its OWNER's turn", async () => {
    const s = place();
    const base = s.perm("base");
    s.state.turnSeat = 0;

    await s.engine.recomputeContinuousEffects();

    const colors = effectiveColors(s, base);
    expect(colors).toContain("Purple");
    expect(colors).toContain("Black");
  });

  it("[All Turns] means the grant ALSO holds on the OPPONENT's turn (unlike a [Your Turn] grant)", async () => {
    const s = place();
    const base = s.perm("base");
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    const colors = effectiveColors(s, base);
    expect(colors).toContain("Purple");
    expect(colors).toContain("Black"); // still granted — this clause is not turn-gated
  });

  it("may trash a hand card to gain Blocker and Retaliation when digivolving", async () => {
    const s = setup({
      0: {
        battleArea: [{ card: "BT6-077", as: "rebellimon" }],
        hand: [{ card: "BT6-068", as: "cost" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rebellimon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Retaliation")).toBe(true);
  });
});
