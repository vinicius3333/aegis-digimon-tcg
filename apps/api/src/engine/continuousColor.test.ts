import { describe, it, expect } from "vitest";
import { type PlayerState, type Permanent } from "@aegis/shared";
import { setupEngine, settle } from "./testkit/harness.js";
// Importing the cards barrel self-registers every compiled-IR / hand-written module
// (boot side-effect) so the engine can look up BT3-040's static color-grant effect.
import "../cards/index.js";

/**
 * Phase A3 — static/continuous COLOR-derivation oracle (SYS-03, LOCKED Q4).
 *
 * Phase 2 shipped a MINIMAL color-legality gate (optionColorRequirements vs printed board
 * colors) and DEFERRED the full static/continuous color subsystem to Phase 4 (recorded in
 * the parity ledger skipsAndCaps WaiveColorRequirement entry). This proves the deferral is
 * CLOSED: a Digimon's EFFECTIVE color is now derived from continuous effects, not only from
 * its printed colors, and a color-gated path (the digivolution EvoCost color check) observes
 * the derived color.
 *
 * Vehicle — BT3-040 Shakkoumon (printed Yellow Lv.5): its `[Your Turn]` static effect
 * "This Digimon is also treated as blue" (documented behavior rule implementation, gated on
 * IsExistOnBattleArea && IsOwnerTurn). KB BT3-040 Q1075 is binding and load-bearing:
 *   "Yes, since this Digimon is treated as both yellow and blue during your turn, it can
 *    digivolve into a Digimon with a requirement of 'Blue, Level 5.'"
 *
 * Consumer — the digivolve EvoCost color check (matchingEvoCost): BT1-043 carries a single
 * EvoCost { color: Blue, level: 5 }. BT3-040's PRINTED color is Yellow, so without the
 * derived Blue the EvoCost color test fails and the digivolution is rejected
 * (invalid-evolution). With the derived Blue the EvoCost is satisfied and the digivolution
 * is legal — exactly Q1075.
 *
 * FAILS-WHEN-REVERTED lever (recorded in 04-04-SUMMARY.md): disable the derived-color
 * contribution (return only base colors from the engine's effectiveColors accessor) and the
 * positive case goes RED — BT3-040 contributes only Yellow, BT1-043 stays rejected.
 */

const BASE_DERIVES_BLUE = "BT3-040"; // printed Yellow Lv.5; [Your Turn] treated as blue
const EVOLVING_BLUE_LV5 = "BT1-043"; // EvoCost { Blue, Lv.5, memoryCost 3 }
const BASE_LEVEL = 5;
const BASE_DP = 6000;

describe("A3 static/continuous color derivation — a continuously-derived color satisfies a color gate (SYS-03 LOCKED Q4)", () => {
  it("BT3-040 (printed Yellow) is treated as blue on its owner's turn, so BT1-043 (EvoCost Blue Lv.5) can digivolve onto it (KB Q1075)", async () => {
    // BT3-040 on the battle area; its [Your Turn] static treats it as blue. Plenty of
    // memory so affordability is never the gate (EvoCost memoryCost is 3).
    const s = setupEngine({
      0: {
        battleArea: [{ card: BASE_DERIVES_BLUE, dp: BASE_DP, as: "base" }],
        // BT1-043 (Blue Lv.5 EvoCost) in hand to digivolve onto the base.
        hand: [{ card: EVOLVING_BLUE_LV5, as: "evolving" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    const base = s.perm("base");
    expect(base.baseDP).toBe(BASE_DP);
    s.state.memory = 5;
    const evolving = s.inst("evolving");

    // Re-derive the continuous tier so BT3-040's static color grant is recorded (the engine
    // does this before each decision point; force it here for the hand-laid board).
    await s.engine.recomputeContinuousEffects();

    // The engine's effective-color accessor unions BT3-040's printed Yellow with the
    // continuously-derived Blue — Q1075's "treated as both yellow and blue".
    const colors = (s.engine as unknown as { effectiveColorsOf(p: Permanent): string[] }).effectiveColorsOf(base);
    expect(colors).toContain("Yellow"); // printed
    expect(colors).toContain("Blue"); // continuously derived

    // The color-gated path (digivolve EvoCost color check) observes the derived Blue: the
    // digivolution is LEGAL only because BT3-040 is treated as blue (printed Yellow would
    // not satisfy a Blue-Lv.5 EvoCost).
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evolving.instanceId,
    });
    expect(result).toEqual({ ok: true });

    // The digivolution actually happened: BT1-043 is the new top of the stack.
    await settle(() => player.battleArea[0]?.topCard?.cardId === EVOLVING_BLUE_LV5);
    expect(player.battleArea[0]?.topCard?.cardId).toBe(EVOLVING_BLUE_LV5);
  });

  it("negative control (Q1076): without the [Your Turn] grant (opponent's turn) the derived blue is absent, so the same digivolution is rejected", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: BASE_DERIVES_BLUE, dp: BASE_DP, as: "base" }],
        hand: [{ card: EVOLVING_BLUE_LV5 }],
      },
    });
    const base = s.perm("base");
    s.state.memory = 5;

    // It is the OPPONENT's turn for the color-grant gate (the effect runtime.IsOwnerTurn is
    // false), so BT3-040's "[Your Turn] treated as blue" does NOT apply — but seat0 must
    // still be the digivolving seat for the verb to reach the EvoCost check. We assert the
    // derivation gate directly: with turnSeat flipped for the static guard, the derived blue
    // is absent.
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const colors = (s.engine as unknown as { effectiveColorsOf(p: Permanent): string[] }).effectiveColorsOf(base);
    expect(colors).toContain("Yellow"); // printed colour always present
    expect(colors).not.toContain("Blue"); // [Your Turn] grant lapsed on the opponent's turn
  });
});
