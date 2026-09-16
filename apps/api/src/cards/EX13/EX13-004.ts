import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-004 DemiMeramon (Digi-Egg, Lv.2 Yellow In-Training, play cost -1, DP 0).
//
// Printed inherited effect (the card's only text):
//   [When Attacking] [Once Per Turn] This Digimon may digivolve into a Digimon card with
//   [Witchelny] in its text in the hand with the cost reduced by 1. If this effect digivolved,
//   trash your top security card.
//
// KB: `node tools/kb/query.mjs card EX13-004` reports no entries — EX13 is pre-release. General
// rules consulted: comprehensive §4-22-1 (a "[X] in its text" reference reads the card's name,
// traits and printed effect text as one union) and KB BT19-084 Q3146-Q3150, which is the ruling
// behind the engine's `ifThisEffectDigivolved` condition: the follow-up process happens only when
// the preceding optional digivolution actually resolved, and a declined or illegal digivolution
// leaves it untouched.
//
// Shape follows the set's Digi-Egg family: EX13-001 and EX13-003 supply the
// `isInherited` + `frequency: "OncePerTurn"` + `Digivolve` with `isSelf`/`from: ["hand"]`/
// `reduceCost` half. Unlike those two, the printed timing here is a PLAIN `[When Attacking]`
// window, so there is no `SubTrigger` wrapper — the trigger tag is the window itself.
//
// "with [Witchelny] in its text" is the widest of the three bracket readings: `match: "text"`
// spans name ∪ traits ∪ printed text (EX13-011/EX13-012's "w/[Huckmon] in text", EX13-019,
// EX13-048). It therefore accepts BOTH a card carrying the [Witchelny] TYPE (FlameWizardmon
// EX13-029, Mistymon EX13-033) and one that merely mentions [Witchelny] in a printed sentence
// (Candlemon EX13-025's own [Rule] line). A `match: "trait"` encoding would wrongly drop the
// latter family, which is exactly the family this Digi-Egg is printed to support.
//
// "into a Digimon card ... in the hand" is `kind: ["Digimon"]` + `from: ["hand"]`; "with the cost
// reduced by 1" is `reduceCost: 1` on top of `payCost: true` (the digivolution cost is still
// paid, just discounted). "may" is `optional: true`.
//
// "If this effect digivolved, trash your top security card" is the EX11-005 shape: a second
// action in the SAME list, gated by `condition: { kind: "ifThisEffectDigivolved" }`. The trash is
// modelled with `trashSecurityTop` rather than a `cost` on the digivolution, because it is a
// CONSEQUENCE, not a payment — an empty security stack must not make the digivolution illegal,
// and the card is printed to be playable with zero security.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
          },
          from: ["hand"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          raw: "This Digimon may digivolve into a Digimon card with [Witchelny] in its text in the hand with the cost reduced by 1",
        },
        {
          kind: "trashSecurityTop",
          controller: "mine",
          count: 1,
          condition: { kind: "ifThisEffectDigivolved", raw: "this effect digivolved" },
          raw: "If this effect digivolved, trash your top security card",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-004", compiled);
