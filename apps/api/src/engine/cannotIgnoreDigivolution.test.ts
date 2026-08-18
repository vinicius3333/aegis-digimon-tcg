import { describe, it, expect } from "vitest";
import { EffectDuration, type Seat } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "./testkit/harness.js";
import { ContinuousEffectLedger } from "./effects/continuous.js";
import "../cards/index.js"; // self-register compiled cards so EvoCost lookups resolve

/**
 * WR-01 consume-site: BT8-059's "players can't ignore digivolution requirements" rule
 * (rule implementation; KB Q1738-Q1743) must suppress an existing
 * ignore-requirements path. The engine's only such path at the digivolve site is the
 * WaiveColorRequirement color waiver (matchingEvoCostIgnoringColor drops the color requirement).
 * Per Q1741 ("players can't ignore part of the digivolution requirements such as levels"), waiving
 * the COLOR requirement is itself an ignored requirement — so while the rule is active the waiver
 * does not apply and the color test is re-enforced.
 *
 * Vehicle (color mismatch, level match):
 *   base    BT1-024 — vanilla Red, Level 5.
 *   evolving BT1-043 — EvoCost { Blue, Level 5 }. Red != Blue, but the levels match.
 *
 * Three states, all on the digivolving seat's own turn:
 *   1. no waiver            => Red != Blue => rejected (invalid-evolution).
 *   2. color waiver         => color dropped, level matches => LEGAL.
 *   3. waiver + BT8-059 rule => waiver suppressed => rejected again.
 *
 * FAILS-WHEN-REVERTED: drop the `!cannotIgnoreDigivolution(turnSeat)` guard from the engine's
 * colorWaived binding and state 3 re-legalizes (the waiver applies despite the rule) => the
 * "rejected" assertion goes RED.
 */

const BASE_RED_LV5 = "BT1-024";
const EVOLVING_BLUE_LV5 = "BT1-043"; // EvoCost { Blue, Lv.5, memoryCost 3 }

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

/** Build a fresh board with the Red base + Blue-EvoCost evolving card, return the digivolve intent. */
function board(): { s: EngineSetup; permanentId: string; instanceId: string } {
  const s = setupEngine({
    0: {
      battleArea: [{ card: BASE_RED_LV5, dp: 6000, as: "base" }],
      hand: [{ card: EVOLVING_BLUE_LV5, as: "evolving" }],
    },
  });
  s.state.memory = 5;
  return { s, permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId };
}

describe("WR-01 — cannotIgnoreDigivolution suppresses the color-requirement waiver at digivolve", () => {
  it("rejects an off-color digivolve with no waiver (control)", () => {
    const { s, ...ids } = board();
    expect(s.engine.applyIntent(0, { type: "digivolve", ...ids })).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
  });

  it("a color waiver makes the off-color digivolve legal", () => {
    const { s, ...ids } = board();
    ledger(s).addColorWaiver(ids.instanceId, EffectDuration.UntilEachTurnEnd);
    expect(s.engine.applyIntent(0, { type: "digivolve", ...ids })).toEqual({ ok: true });
  });

  it("BT8-059's rule suppresses the waiver, re-rejecting the off-color digivolve (Q1741)", () => {
    const { s, ...ids } = board();
    ledger(s).addColorWaiver(ids.instanceId, EffectDuration.UntilEachTurnEnd);
    // BT8-059 installs the rule for BOTH seats (Q1738); the digivolving seat (0) is barred.
    ledger(s).addCannotIgnoreDigivolution(0 as Seat, EffectDuration.UntilEachTurnEnd);
    expect(s.engine.applyIntent(0, { type: "digivolve", ...ids })).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
  });
});
