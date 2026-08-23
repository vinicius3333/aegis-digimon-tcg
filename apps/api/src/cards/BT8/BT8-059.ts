// HAND-AUTHORED OVERRIDE (no AUTO-GENERATED header => the generator preserves this file).
//
// (documented behavior) and the KB (node tools/kb/query.mjs card BT8-059, Q1738-Q1743).
//
// `rule implementation` while this card is on the battle area
// rule apply to every digivolution-requirement-ignoring attempt.
//
// KB rulings (Q1738-Q1743):
//   - Q1738: the rule affects BOTH players.
//   - Q1739: DNA digivolution and Burst Digivolve are still possible (not "ignoring requirements").
//   - Q1740: digivolving WITHOUT paying the cost is still possible (not "ignoring requirements").
//   - Q1741: ignoring PART of the requirements (e.g. levels) is BLOCKED.
//   - Q1742: a BT10-067-style [When Attacking] ignore-requirements digivolve is BLOCKED.
//   - Q1743: effects that ADD digivolution info (e.g. BT4-011) are still OK (adding != ignoring).
//
// Authoring: a `[All Turns]` continuous static effect (interpreter routes "AllTurns" -> the
// staticModifier builder with NO turn gate, re-derived each continuous-recompute pass per CR-01)
// carrying a `CannotIgnoreDigivolutionRequirements` action (affects:"both"). The interpreter
// installs a seat-level `cannotIgnoreDigivolutionRequirements` rule (the continuous-ledger flag
// `cannotIgnoreDigivolution`) for BOTH seats (Q1738).
//
// === A3-PROVEN consumer (supersedes the prior "faithful-by-absence" sign-off; WR-01) ===
// The rule SUPPRESSES both partial requirement waivers (the normal digivolve color-waiver route,
// Q1741) and whole requirement waivers in effect-driven Digivolve actions (Critical Arm, Q1742).
// Both paths consume `ContinuousEffectLedger.cannotIgnoreDigivolution(seat)`; the latter checks at
// candidate filtering and again in the primitive. Proven by cannotIgnoreDigivolution.test.ts and
// justimon-critical-arm-swap-deck.test.ts. DNA/Burst, no-cost digivolves, and add-info effects are
// unaffected (Q1739/Q1740/Q1743), matching the printed text.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      // [All Turns] players can't ignore digivolution requirements (both seats, Q1738).
      trigger: "AllTurns",
      actions: [
        {
          kind: "CannotIgnoreDigivolutionRequirements",
          affects: "both",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-059", compiled);
